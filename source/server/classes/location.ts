import { Location as DarwinLocation } from "../sources/darwin-push-port/types/reference/location.js"
import { TrainOperatingCompany } from "./toc.js"

export class Location {
	public readonly tiploc: string

	public readonly crs?: string
	public readonly name?: string

	public readonly operator?: TrainOperatingCompany

	public readonly isStation: boolean = false

	public constructor(darwinData: DarwinLocation, operators: TrainOperatingCompany[]) {
		this.tiploc = darwinData.tpl

		this.crs = darwinData.crs
		if (darwinData.locname !== darwinData.tpl) this.name = darwinData.locname

		if (darwinData.toc) {
			const operator = operators.find(operator => operator.code === darwinData.toc)
			if (!operator) throw new Error(`Unknown operator '${darwinData.toc}'!`)

			this.operator = operator
		}

		this.isStation = this.crs !== undefined && this.name !== undefined
	}
}
