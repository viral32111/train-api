import moment, { Moment } from "moment"

import { Journey as DarwinJourney } from "../sources/national-rail-data-portal/darwin-push-port/types/time-table/journey.js"
import { Location } from "./location.js"
import { Point } from "./point.js"

export class Journey {
	public readonly id: string // Train UID
	public readonly headCode: string // Train ID (Headcode)
	public readonly rttiId: string // RTTI Unique Train ID

	public readonly scheduledStartDate: Moment // Scheduled Start Date
	public readonly atocCode: string // ATOC Code

	public readonly type?: string // Type of service (train/bus/ship)
	public readonly category?: string // Category of service
	public readonly isQ: boolean = false // Is this a Q train?

	public readonly isPassenger: boolean = true // Is Passenger Service?

	public readonly isCancelled: boolean = false // Is Cancelled?
	public readonly cancellationReason?: string // Cancellation Reason

	public readonly originPoint: Point // Origin point
	public readonly intermediatePoints: Point[] = [] // Intermediate passenger & passing points
	public readonly destinationPoint: Point // Destination point

	public constructor(darwinData: DarwinJourney, locations: Location[]) {
		this.id = darwinData.$.uid
		this.headCode = darwinData.$.trainId
		this.rttiId = darwinData.$.rid

		this.scheduledStartDate = moment.utc(darwinData.$.ssd, "YYYY-MM-DD")
		this.atocCode = darwinData.$.toc

		this.type = darwinData.$.status
		this.category = darwinData.$.trainCat
		this.isQ = darwinData.$.qtrain === "true"

		this.isPassenger = !(darwinData.$.isPassengerSvc === "false")

		this.isCancelled = darwinData.$.can === "true"
		this.cancellationReason = darwinData.$.cancelReason

		const originPoint = darwinData.$$.or?.[0]?.$ ?? darwinData.$$.opor?.[0]?.$
		if (!originPoint) throw new Error("Journey has no origin point")

		const destinationPoint = darwinData.$$.dt?.[0]?.$ ?? darwinData.$$.opdt?.[0]?.$
		if (!destinationPoint) throw new Error("Journey has no destination point")

		this.originPoint = new Point(originPoint, this.scheduledStartDate, locations)
		this.destinationPoint = new Point(destinationPoint, this.scheduledStartDate, locations)

		// Add intermediate points
		if (Array.isArray(darwinData.$$.pp))
			this.intermediatePoints.push(
				...darwinData.$$.pp.map(point => new Point(point.$, this.scheduledStartDate, locations))
			)
		if (Array.isArray(darwinData.$$.ip))
			this.intermediatePoints.push(
				...darwinData.$$.ip.map(point => new Point(point.$, this.scheduledStartDate, locations))
			)
		if (Array.isArray(darwinData.$$.opip))
			this.intermediatePoints.push(
				...darwinData.$$.opip.map(point => new Point(point.$, this.scheduledStartDate, locations))
			)

		// Sort intermediate points by working scheduled arrival time
		this.intermediatePoints.sort((a, b) => {
			if (!a.workingScheduledArrivalTime) return 1
			if (!b.workingScheduledArrivalTime) return -1

			return a.workingScheduledArrivalTime.diff(b.workingScheduledArrivalTime)
		})

		if (!this.originPoint.location.tiploc)
			throw new Error(
				`Journey (service ${this.headCode} / ${this.id}) has no origin point TIPLOC: '${JSON.stringify(
					darwinData
				)}'`
			)
		if (!this.destinationPoint.location.tiploc)
			throw new Error(
				`Journey (service ${this.headCode} / ${this.id}) has no destination point TIPLOC: '${JSON.stringify(
					darwinData
				)}'`
			)

		if (!this.originPoint.workingScheduledDepartureTime)
			throw new Error(
				`Journey (service ${this.headCode} / ${
					this.id
				}) has no origin point working scheduled departure time: '${JSON.stringify(darwinData)}'`
			)

		if (!this.destinationPoint.workingScheduledArrivalTime)
			throw new Error(
				`Journey (service ${this.headCode} / ${
					this.id
				}) has no destination point working scheduled arrival time: '${JSON.stringify(darwinData)}'`
			)
	}

	public toString = (): string =>
		`${this.headCode} (${this.id}) ${this.originPoint.location.crs ?? this.originPoint.location.tiploc} (${
			this.originPoint.location.name ?? this.originPoint.location.tiploc
		}) @ ${this.originPoint.workingScheduledDepartureTime?.format("DD/MM/YYYY HH:mm:ss")} [${
			this.originPoint.location.operator?.name ?? "?"
		}] -> ${this.destinationPoint.location.crs ?? this.destinationPoint.location.tiploc} (${
			this.destinationPoint.location.name ?? this.destinationPoint.location.tiploc
		}) @ ${this.destinationPoint.workingScheduledArrivalTime?.format("DD/MM/YYYY HH:mm:ss")} [${
			this.destinationPoint.location.operator?.name ?? "?"
		}]`

	public getCallingPoint(tiploc: string): Point | undefined {
		if (this.originPoint.location.tiploc === tiploc) return this.originPoint
		if (this.destinationPoint.location.tiploc === tiploc) return this.destinationPoint

		return this.intermediatePoints.find(point => point.location.tiploc === tiploc)
	}
}
