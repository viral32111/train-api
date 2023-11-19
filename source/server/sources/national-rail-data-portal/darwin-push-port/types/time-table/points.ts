interface Point {
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

export interface OriginPoint extends Point {
	plat?: string // Platform Number

	wtd: string // Working Scheduled Departure Time
	ptd?: string // Public Scheduled Departure Time
}

export interface IntermediatePassingPoint extends Point {
	plat?: string // Platform Number

	wtp: string // Working Scheduled Passing Time

	pta?: string // Public Scheduled Arrival Time
	ptd?: string // Public Scheduled Departure Time
}

export interface IntermediateCallingPoint extends Point {
	plat: string // Platform Number

	wta: string // Working Scheduled Arrival Time
	wtd: string // Working Scheduled Departure Time

	pta?: string // Public Scheduled Arrival Time
	ptd?: string // Public Scheduled Departure Time
}

export interface DestinationPoint extends Point {
	plat?: string // Platform Number

	wta: string // Working Scheduled Arrival Time
	pta?: string // Public Scheduled Arrival Time
}
