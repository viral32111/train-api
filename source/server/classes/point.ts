import moment, { Moment } from "moment"

import {
	DestinationPoint,
	IntermediateCallingPoint,
	IntermediatePassingPoint,
	OriginPoint
} from "../sources/national-rail-data-portal/darwin-push-port/types/time-table/points.js"
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
		darwinData: OriginPoint | IntermediatePassingPoint | IntermediateCallingPoint | DestinationPoint,
		date: Moment,
		locations: Location[]
	) {
		const location = locations.find(location => location.timingPointLocationCode === darwinData.tpl)
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
