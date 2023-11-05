import { writeFile } from "fs/promises"

import log4js from "log4js"

import { parseXML } from "../sources/darwinPushPort.js"
import { DarwinJourney, Journey } from "./journey.js"
import { DarwinTimeTableReferenceLocation, Location } from "./location.js"
import { DarwinTimeTableReferenceTOC, TrainOperatingCompany } from "./toc.js"

const log = log4js.getLogger("timetable")

export class TimeTable {
	public readonly operators: TrainOperatingCompany[] = []
	public readonly locations: Location[] = []

	public readonly journeys: Journey[] = []

	public constructor(darwinData: DarwinTimeTable, darwinReferenceData: DarwinTimeTableReference) {
		log.debug("Mapping operators...")
		this.operators = darwinReferenceData.pporttimetableref.$$.tocref.map(toc => new TrainOperatingCompany(toc.$))

		log.debug("Mapping locations...")
		this.locations = darwinReferenceData.pporttimetableref.$$.locationref.map(
			location => new Location(location.$, this.operators)
		)

		log.debug("Mapping journeys...")
		this.journeys = darwinData.pporttimetable.$$.journey.map(journey => new Journey(journey, this.locations))
	}

	public static async parse(xmlData: Buffer, xmlReferenceData: Buffer): Promise<TimeTable> {
		log.debug("Parsing timetable data...")
		const darwinData = await parseXML<DarwinTimeTable>(xmlData)
		log.debug("Parsing reference data...")
		const darwinReferenceData = await parseXML<DarwinTimeTableReference>(xmlReferenceData)
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
				journey.originPoint.location.tiploc === originTiploc &&
				journey.destinationPoint.location.tiploc === destinationTiploc
			) {
				matchingJourneys.push(journey)
				continue
			}

			if (
				journey.destinationPoint.location.tiploc === originTiploc &&
				journey.originPoint.location.tiploc === destinationTiploc
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

export interface DarwinTimeTable {
	pporttimetable: {
		$: {
			timetableID: string
		}
		$$: {
			journey: DarwinJourney[]
		}
	}
}

export interface DarwinTimeTableReference {
	pporttimetableref: {
		$: {
			timetableId: string
		}
		$$: {
			locationref: { $: DarwinTimeTableReferenceLocation }[] // TIPLOC to CRS/name
			tocref: { $: DarwinTimeTableReferenceTOC }[] // TOC code to name
			laterunningreasons: { $$: { reason: DarwinTimeTableReferenceReason[] } } // Late running reason code to text
			cancellationreasons: { $$: { reason: DarwinTimeTableReferenceReason[] } } // Cancellation reason code to text
			via: { $: DarwinTimeTableReferenceVia[] } // Vias
			cissource: { $: DarwinTimeTableReferenceCIS[] } // CIS source codes to names
			loadingcategories: { $$: { category: DarwinTimeTableReferenceLoadingCategory[] } } // Loading categories
		}
	}
}

export interface DarwinTimeTableReferenceReason {
	code: string // Reason code
	reasontext: string // Human-readable reason
}

export interface DarwinTimeTableReferenceVia {
	at: string // TIPLOC
	dest: string // TIPLOC

	loc1: string // TIPLOC
	loc2?: string // TIPLOC

	viatext: string // Human-readable announcer message
}

export interface DarwinTimeTableReferenceCIS {
	code: string // CIS source code
	name: string // Human-readable name
}

export interface DarwinTimeTableReferenceLoadingCategory {
	$: {
		Code: string // Loading category code
		Name: string // Human-readable message
		Toc?: string // TOC (operator) code
	}
	$$: {
		typicaldescription: string[]
		expecteddescription: string[]
		definition: string[]
		colour?: string[]
		image?: string[]
	}
}
