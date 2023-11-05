// https://wiki.openraildata.com/index.php/TOC_Codes

export class TrainOperatingCompany {
	public readonly code: string
	public readonly name: string
	public readonly mapUrl: string

	public constructor(darwinData: DarwinTimeTableReferenceTOC) {
		this.code = darwinData.toc
		this.name = darwinData.tocname
		this.mapUrl = darwinData.url
	}
}

export interface DarwinTimeTableReferenceTOC {
	toc: string // TOC (operator) code
	tocname: string // Human-readable name
	url: string // Map URL
}
