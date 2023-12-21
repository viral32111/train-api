import { writeFile } from "fs/promises"

import log4js from "log4js"

import { parse } from "../helpers/xml.js"
import { Reference as DarwinReference } from "../sources/national-rail-data-portal/darwin-push-port/types/reference/reference.js"
import { TimeTable as DarwinTimeTable } from "../sources/national-rail-data-portal/darwin-push-port/types/time-table/time-table.js"
import { Journey } from "./journey.js"
import { Location } from "./location.js"
import { TrainOperatingCompany } from "./toc.js"

const log = log4js.getLogger("timetable")

export class TimeTable {
	public readonly operators: TrainOperatingCompany[] = []
	public readonly locations: Location[] = []

	public readonly journeys: Journey[] = []

	public constructor(darwinData: DarwinTimeTable, darwinReferenceData: DarwinReference) {
		log.debug("Mapping operators...")
		this.operators = darwinReferenceData.pporttimetableref.$$.tocref.map(toc => new TrainOperatingCompany(toc.$))
		log.debug("Mapped %d operator(s).", this.operators.length)

		log.debug("Mapping locations...")
		this.locations = darwinReferenceData.pporttimetableref.$$.locationref.map(
			location => new Location(location.$, this.operators)
		)
		log.debug("Mapped %d location(s).", this.locations.length)

		log.debug("Mapping journeys...")
		this.journeys = darwinData.pporttimetable.$$.journey.map(journey => new Journey(journey, this.locations))
		log.debug("Mapped %d journey(s).", this.journeys.length)
	}

	public static async parse(xmlData: string, xmlReferenceData: string): Promise<TimeTable> {
		log.debug("Parsing timetable data...")
		const darwinData = await parse<DarwinTimeTable>(xmlData)
		log.debug("Parsing reference data...")
		const darwinReferenceData = await parse<DarwinReference>(xmlReferenceData)
		log.debug("Parsed timetable & reference data.")

		await writeFile("data/parsed-timetable.json", JSON.stringify(darwinData, null, 1))
		await writeFile("data/parsed-reference.json", JSON.stringify(darwinReferenceData, null, 1))
		log.debug("Saved parsed timetable & reference data.")

		return new this(darwinData, darwinReferenceData)
	}

	public getJourneysBetween(originTiploc: string, destinationTiploc: string): Journey[] {
		const matchingJourneys = []

		for (const journey of this.journeys) {
			if (
				journey.originPoint.location.timingPointLocationCode === originTiploc &&
				journey.destinationPoint.location.timingPointLocationCode === destinationTiploc
			) {
				matchingJourneys.push(journey)
				continue
			}

			if (
				journey.destinationPoint.location.timingPointLocationCode === originTiploc &&
				journey.originPoint.location.timingPointLocationCode === destinationTiploc
			) {
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
