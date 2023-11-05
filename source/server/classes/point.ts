import moment, { Moment } from "moment"

import { Location } from "./location.js"

export class Point {
	public readonly location: Location // TIPLOC, etc.

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
			| DarwinJourneyDestinationPoint,
		date: Moment,
		locations: Location[]
	) {
		const location = locations.find(location => location.tiploc === darwinData.tpl)
		if (!location) throw new Error(`Unknown location '${darwinData.tpl}'!`)
		this.location = location

		this.activity = darwinData.act

		if (darwinData.plat) this.platform = darwinData.plat

		if ("wta" in darwinData && darwinData.wta)
			this.workingScheduledArrivalTime = moment.utc(darwinData.wta, "HH:mm:ss").set({
				year: date.year(),
				month: date.month(),
				day: date.day()
			})
		if ("wtd" in darwinData && darwinData.wtd)
			this.workingScheduledDepartureTime = moment.utc(darwinData.wtd, "HH:mm:ss").set({
				year: date.year(),
				month: date.month(),
				day: date.day()
			})
		if ("wtp" in darwinData && darwinData.wtp)
			this.workingScheduledDepartureTime = moment.utc(darwinData.wtp, "HH:mm:ss").set({
				year: date.year(),
				month: date.month(),
				day: date.day()
			})

		if ("pta" in darwinData && darwinData.pta)
			this.publicScheduledArrivalTime = moment.utc(darwinData.pta, "HH:mm:ss").set({
				year: date.year(),
				month: date.month(),
				day: date.day()
			})
		if ("ptd" in darwinData && darwinData.ptd)
			this.publicScheduledDepartureTime = moment.utc(darwinData.ptd, "HH:mm:ss").set({
				year: date.year(),
				month: date.month(),
				day: date.day()
			})

		if ("rdelay" in darwinData && darwinData.rdelay) this.changeRouteDelay = parseInt(darwinData.rdelay, 10)
		if ("fd" in darwinData && darwinData.fd) this.falseDestination = darwinData.fd
	}
}

export interface DarwinJourneyPoint {
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

export interface DarwinJourneyOriginPoint extends DarwinJourneyPoint {
	plat?: string // Platform Number

	wtd: string // Working Scheduled Departure Time
	ptd?: string // Public Scheduled Departure Time
}

export interface DarwinJourneyIntermediatePassingPoint extends DarwinJourneyPoint {
	plat?: string // Platform Number

	wtp: string // Working Scheduled Passing Time

	pta?: string // Public Scheduled Arrival Time
	ptd?: string // Public Scheduled Departure Time
}

export interface DarwinJourneyIntermediateCallingPoint extends DarwinJourneyPoint {
	plat: string // Platform Number

	wta: string // Working Scheduled Arrival Time
	wtd: string // Working Scheduled Departure Time

	pta?: string // Public Scheduled Arrival Time
	ptd?: string // Public Scheduled Departure Time
}

export interface DarwinJourneyDestinationPoint extends DarwinJourneyPoint {
	plat?: string // Platform Number

	wta: string // Working Scheduled Arrival Time
	pta?: string // Public Scheduled Arrival Time
}
