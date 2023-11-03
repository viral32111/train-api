import { XMLParser } from "fast-xml-parser"
import moment, { Moment } from "moment"

//const log = log4js.getLogger("journey")

export class TimeTable {
	private static xmlParser = new XMLParser({
		ignoreAttributes: false
	})

	public readonly journeys: Journey[] = []

	public constructor(xml: Buffer) {
		const timetableData = TimeTable.xmlParser.parse(xml) as DarwinTimetable

		this.journeys = timetableData.PportTimetable.Journey.map(journey => new Journey(journey))
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

	public readonly isPassenger: boolean = true // Is Passenger Service?

	public readonly originPoint: Point // Origin point
	public readonly intermediatePoints: Point[] = [] // Intermediate passenger & passing points
	public readonly destinationPoint: Point // Destination point

	public constructor(darwinData: DarwinJourney) {
		this.id = darwinData["@_uid"]
		this.headCode = darwinData["@_trainId"]
		this.rttiId = darwinData["@_rid"]

		this.scheduledStartDate = moment.utc(darwinData["@_ssd"], "YYYY-MM-DD")
		this.atocCode = darwinData["@_toc"]

		this.type = darwinData["@_status"]
		this.category = darwinData["@_trainCat"]

		this.isPassenger = !(darwinData["@_isPassengerSvc"] === "false")

		const originPoint = darwinData.OR ?? darwinData.OPOR
		if (!originPoint) throw new Error("Journey has no origin point")

		const destinationPoint = darwinData.DT ?? darwinData.OPDT
		if (!destinationPoint) throw new Error("Journey has no destination point")

		this.originPoint = new Point(originPoint)
		this.destinationPoint = new Point(destinationPoint)

		// Add intermediate points
		if (Array.isArray(darwinData.PP)) this.intermediatePoints.push(...darwinData.PP.map(point => new Point(point)))
		if (Array.isArray(darwinData.IP)) this.intermediatePoints.push(...darwinData.IP.map(point => new Point(point)))
		if (Array.isArray(darwinData.OPIP))
			this.intermediatePoints.push(...darwinData.OPIP.map(point => new Point(point)))

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
		this.tiploc = darwinData["@_tpl"]
		this.activity = darwinData["@_act"]

		if (darwinData["@_plat"]) this.platform = darwinData["@_plat"]

		if ("@_wta" in darwinData && darwinData["@_wta"])
			this.workingScheduledArrivalTime = moment.utc(darwinData["@_wta"], "HH:mm:ss")
		if ("@_wtd" in darwinData && darwinData["@_wtd"])
			this.workingScheduledDepartureTime = moment.utc(darwinData["@_wtd"], "HH:mm:ss")
		if ("@_wtp" in darwinData && darwinData["@_wtp"])
			this.workingScheduledDepartureTime = moment.utc(darwinData["@_wtp"], "HH:mm:ss")

		if ("@_pta" in darwinData && darwinData["@_pta"])
			this.publicScheduledArrivalTime = moment.utc(darwinData["@_pta"], "HH:mm:ss")
		if ("@_ptd" in darwinData && darwinData["@_ptd"])
			this.publicScheduledDepartureTime = moment.utc(darwinData["@_ptd"], "HH:mm:ss")

		if ("@_rdelay" in darwinData && darwinData["@_rdelay"])
			this.changeRouteDelay = parseInt(darwinData["@_rdelay"], 10)
		if ("@_fd" in darwinData && darwinData["@_fd"]) this.falseDestination = darwinData["@_fd"]
	}
}

interface DarwinTimetable {
	PportTimetable: {
		Journey: DarwinJourney[]
	}
}

interface DarwinJourney {
	"@_rid": string // RTTI (Unique) Train Identifier
	"@_uid": string // Train Unique Identifier
	"@_trainId": string // Train Identifier (Headcode)
	"@_toc": string // ATOC Code

	"@_ssd": string // Scheduled Start Date

	"@_status"?: string // Type of service (train/bus/ship)
	"@_trainCat"?: string // Train category
	"@_isPassengerSvc"?: string // Is Passenger Service?

	"@_cancelReason"?: string // Cancellation Reason

	"OR"?: DarwinJourneyOriginPoint // Origin Point
	"OPOR"?: DarwinJourneyOriginPoint // Operational Origin Point
	"PP"?: DarwinJourneyIntermediatePassingPoint[] // Intermediate Passing Point
	"IP"?: DarwinJourneyIntermediateCallingPoint[] // Intermediate Calling Point
	"OPIP"?: DarwinJourneyIntermediateCallingPoint[] // Operational Intermediate Calling Point
	"DT"?: DarwinJourneyDestinationPoint // Destination Point
	"OPDT"?: DarwinJourneyDestinationPoint // Operational Destination Point
}

interface DarwinJourneyPoint {
	"@_tpl": string // TIPLOC

	"@_act"?: string // Activity Code
	"@_planAct"?: string // Planned Activity Code

	"@_can"?: string // Cancelled?

	"@_plat"?: string // Platform Number

	"@_wta"?: string // Working Scheduled Arrival Time
	"@_wtd"?: string // Working Scheduled Departure Time
	"@_wtp"?: string // Working Scheduled Passing Time

	"@_pta"?: string // Public Scheduled Arrival Time
	"@_atd"?: string // Public Scheduled Departure Time

	"@_rdelay"?: string // Delay due to change of route
	"@_fd"?: string // TIPLOC of False Destination
}

interface DarwinJourneyOriginPoint extends DarwinJourneyPoint {
	"@_plat"?: string // Platform Number

	"@_wtd": string // Working Scheduled Departure Time
	"@_ptd"?: string // Public Scheduled Departure Time
}

interface DarwinJourneyIntermediatePassingPoint extends DarwinJourneyPoint {
	"@_plat"?: string // Platform Number

	"@_wtp": string // Working Scheduled Passing Time

	"@_pta"?: string // Public Scheduled Arrival Time
	"@_ptd"?: string // Public Scheduled Departure Time
}

interface DarwinJourneyIntermediateCallingPoint extends DarwinJourneyPoint {
	"@_plat": string // Platform Number

	"@_wta": string // Working Scheduled Arrival Time
	"@_wtd": string // Working Scheduled Departure Time

	"@_pta"?: string // Public Scheduled Arrival Time
	"@_ptd"?: string // Public Scheduled Departure Time
}

interface DarwinJourneyDestinationPoint extends DarwinJourneyPoint {
	"@_plat"?: string // Platform Number

	"@_wta": string // Working Scheduled Arrival Time
	"@_pta"?: string // Public Scheduled Arrival Time
}
