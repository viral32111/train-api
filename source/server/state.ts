import { TimeTable } from "./classes/timetable.js"

let timeTable: TimeTable | null = null
export const setTimeTable = (value: TimeTable): TimeTable => (timeTable = value)
export const getTimeTable = (): TimeTable | null => timeTable
