import { Journey } from "./journey.js"

export interface TimeTable {
	pporttimetable: {
		$: {
			timetableID: string
		}
		$$: {
			journey: Journey[]
		}
	}
}
