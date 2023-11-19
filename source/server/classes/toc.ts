import { TrainOperatingCompany as DarwinTrainOperatingCompany } from "../sources/national-rail-data-portal/darwin-push-port/types/reference/toc.js"

// https://wiki.openraildata.com/index.php/TOC_Codes
export class TrainOperatingCompany {
	public readonly code: string
	public readonly name: string
	public readonly mapUrl: string

	public constructor(darwinData: DarwinTrainOperatingCompany) {
		this.code = darwinData.toc
		this.name = darwinData.tocname
		this.mapUrl = darwinData.url
	}
}
