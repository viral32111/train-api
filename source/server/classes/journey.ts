import { writeFile } from "fs/promises"

import moment, { Moment } from "moment"

import { xmlParser } from "../sources/darwinPushPort.js"

//const log = log4js.getLogger("journey")

export class TimeTable {
	public readonly journeys: Journey[] = []

	public constructor(darwinData: DarwinTimetable) {
		this.journeys = darwinData.pporttimetable.$$.journey.map(journey => new Journey(journey))
	}

	public static async fromXML(xml: Buffer): Promise<TimeTable> {
		const darwinData = (await xmlParser.parseStringPromise(xml)) as DarwinTimetable

		await writeFile("data/parsed.json", JSON.stringify(darwinData, null, 1))

		return new this(darwinData)
	}

	public getJourneysBetween(originTiploc: string, destinationTiploc: string): Journey[] {
		const matchingJourneys = []

		for (const journey of this.journeys) {
			if (journey.originPoint.tiploc === originTiploc && journey.destinationPoint.tiploc === destinationTiploc) {
				matchingJourneys.push(journey)
				continue
			}

			if (journey.destinationPoint.tiploc === originTiploc && journey.originPoint.tiploc === destinationTiploc) {
				matchingJourneys.push(journey)
				continue
			}

			if (journey.getCallingPoint(originTiploc) && journey.getCallingPoint(destinationTiploc)) {
				matchingJourneys.push(journey)
				continue
			}
		}

		matchingJourneys.sort((a, b) => {
			if (!a.originPoint.workingScheduledDepartureTime) return 1
			if (!b.originPoint.workingScheduledDepartureTime) return -1

			return a.originPoint.workingScheduledDepartureTime.diff(b.originPoint.workingScheduledDepartureTime)
		})

		return matchingJourneys
	}
}

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

	public constructor(darwinData: DarwinJourney) {
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

		this.originPoint = new Point(originPoint)
		this.destinationPoint = new Point(destinationPoint)

		// Add intermediate points
		if (Array.isArray(darwinData.$$.pp))
			this.intermediatePoints.push(...darwinData.$$.pp.map(point => new Point(point.$)))
		if (Array.isArray(darwinData.$$.ip))
			this.intermediatePoints.push(...darwinData.$$.ip.map(point => new Point(point.$)))
		if (Array.isArray(darwinData.$$.opip))
			this.intermediatePoints.push(...darwinData.$$.opip.map(point => new Point(point.$)))

		// Sort intermediate points by working scheduled arrival time
		this.intermediatePoints.sort((a, b) => {
			if (!a.workingScheduledArrivalTime) return 1
			if (!b.workingScheduledArrivalTime) return -1

			return a.workingScheduledArrivalTime.diff(b.workingScheduledArrivalTime)
		})

		if (!this.originPoint.tiploc)
			throw new Error(
				`Journey (service ${this.headCode} / ${this.id}) has no origin point TIPLOC: '${JSON.stringify(
					darwinData
				)}'`
			)
		if (!this.destinationPoint.tiploc)
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
		`${this.headCode} (${this.id}) ${
			this.originPoint.tiploc
		} @ ${this.originPoint.workingScheduledDepartureTime?.format("HH:mm:ss")} -> ${
			this.destinationPoint.tiploc
		} @ ${this.destinationPoint.workingScheduledArrivalTime?.format("HH:mm:ss")}`

	public getCallingPoint(tiploc: string): Point | undefined {
		if (this.originPoint.tiploc === tiploc) return this.originPoint
		if (this.destinationPoint.tiploc === tiploc) return this.destinationPoint

		return this.intermediatePoints.find(point => point.tiploc === tiploc)
	}
}

export class Point {
	public readonly tiploc: string // TIPLOC
	public readonly activity?: string // Activity Code

	public readonly platform?: string // Platform Letter / Number

	public readonly workingScheduledArrivalTime?: Moment // Working Scheduled Arrival Time
	public readonly workingScheduledDepartureTime?: Moment // Working Scheduled Departure Time
	public readonly workingScheduledPassingTime?: Moment // Working Scheduled Passing Time

	public readonly publicScheduledArrivalTime?: Moment // Public Scheduled Arrival Time
	public readonly publicScheduledDepartureTime?: Moment // Public Scheduled Departure Time

	public readonly changeRouteDelay?: number // Delay due to change of route
	public readonly falseDestination?: string // TIPLOC of False Destination

	public constructor(
		darwinData:
			| DarwinJourneyOriginPoint
			| DarwinJourneyIntermediatePassingPoint
			| DarwinJourneyIntermediateCallingPoint
			| DarwinJourneyDestinationPoint
	) {
		this.tiploc = darwinData.tpl
		this.activity = darwinData.act

		if (darwinData.plat) this.platform = darwinData.plat

		if ("wta" in darwinData && darwinData.wta)
			this.workingScheduledArrivalTime = moment.utc(darwinData.wta, "HH:mm:ss")
		if ("wtd" in darwinData && darwinData.wtd)
			this.workingScheduledDepartureTime = moment.utc(darwinData.wtd, "HH:mm:ss")
		if ("wtp" in darwinData && darwinData.wtp)
			this.workingScheduledDepartureTime = moment.utc(darwinData.wtp, "HH:mm:ss")

		if ("pta" in darwinData && darwinData.pta)
			this.publicScheduledArrivalTime = moment.utc(darwinData.pta, "HH:mm:ss")
		if ("ptd" in darwinData && darwinData.ptd)
			this.publicScheduledDepartureTime = moment.utc(darwinData.ptd, "HH:mm:ss")

		if ("rdelay" in darwinData && darwinData.rdelay) this.changeRouteDelay = parseInt(darwinData.rdelay, 10)
		if ("fd" in darwinData && darwinData.fd) this.falseDestination = darwinData.fd
	}
}

interface DarwinTimetable {
	pporttimetable: {
		$: {
			timetableID: string
		}
		$$: {
			journey: DarwinJourney[]
		}
	}
}

interface DarwinJourney {
	$: {
		rid: string // RTTI (Unique) Train Identifier
		uid: string // Train Unique Identifier
		trainId: string // Train Identifier (Headcode)
		toc: string // ATOC Code

		ssd: string // Scheduled Start Date

		status?: string // Type of service (train/bus/ship)
		trainCat?: string // Train category
		isPassengerSvc?: string // Is Passenger Service?
		qtrain?: string // Is this a Q train?

		can?: string // Is Cancelled?
		cancelReason?: string // Cancellation Reason
	}
	$$: {
		or?: { $: DarwinJourneyOriginPoint }[] // Origin Point
		opor?: { $: DarwinJourneyOriginPoint }[] // Operational Origin Point
		pp?: { $: DarwinJourneyIntermediatePassingPoint }[] // Intermediate Passing Point
		ip?: { $: DarwinJourneyIntermediateCallingPoint }[] // Intermediate Calling Point
		opip?: { $: DarwinJourneyIntermediateCallingPoint }[] // Operational Intermediate Calling Point
		dt?: { $: DarwinJourneyDestinationPoint }[] // Destination Point
		opdt?: { $: DarwinJourneyDestinationPoint }[] // Operational Destination Point
	}
}

interface DarwinJourneyPoint {
	tpl: string // TIPLOC

	act?: string // Activity Code
	planAct?: string // Planned Activity Code

	can?: string // Cancelled?

	plat?: string // Platform Number

	wta?: string // Working Scheduled Arrival Time
	wtd?: string // Working Scheduled Departure Time
	wtp?: string // Working Scheduled Passing Time

	pta?: string // Public Scheduled Arrival Time
	atd?: string // Public Scheduled Departure Time

	rdelay?: string // Delay due to change of route
	fd?: string // TIPLOC of False Destination
}

interface DarwinJourneyOriginPoint extends DarwinJourneyPoint {
	plat?: string // Platform Number

	wtd: string // Working Scheduled Departure Time
	ptd?: string // Public Scheduled Departure Time
}

interface DarwinJourneyIntermediatePassingPoint extends DarwinJourneyPoint {
	plat?: string // Platform Number

	wtp: string // Working Scheduled Passing Time

	pta?: string // Public Scheduled Arrival Time
	ptd?: string // Public Scheduled Departure Time
}

interface DarwinJourneyIntermediateCallingPoint extends DarwinJourneyPoint {
	plat: string // Platform Number

	wta: string // Working Scheduled Arrival Time
	wtd: string // Working Scheduled Departure Time

	pta?: string // Public Scheduled Arrival Time
	ptd?: string // Public Scheduled Departure Time
}

interface DarwinJourneyDestinationPoint extends DarwinJourneyPoint {
	plat?: string // Platform Number

	wta: string // Working Scheduled Arrival Time
	pta?: string // Public Scheduled Arrival Time
}
