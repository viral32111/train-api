export interface Location {
	tpl: string // TIPLOC (timing point location)

	crs?: string // CRS (computer reservation system) / NRS (national reservation system) code
	locname: string // Human-readable name

	toc?: string // TOC (operator) code
}
