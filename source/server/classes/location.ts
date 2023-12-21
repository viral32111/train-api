import { Location as DarwinLocation } from "../sources/national-rail-data-portal/darwin-push-port/types/reference/location.js"
import { TrainOperatingCompany } from "./toc.js"

export interface LocationJson {
	name: string | null
	timingPointLocationCode: string
	computerReservationSystemCode: string | null
	operatorCode: string | null
	isStation: boolean
	coordinates: {
		latitude: number | null
		longitude: number | null
	}
	address: {
		number: string | null
		street: string | null
		town: string | null
		county: string | null
		country: string | null
		postcode: string | null
	}
}

export class Location {
	public readonly name: string | null = null

	public readonly timingPointLocationCode: string
	public readonly computerReservationSystemCode: string | null = null

	public readonly operator: TrainOperatingCompany | null = null

	public readonly isStation: boolean = false

	public constructor(darwinData: DarwinLocation, operators: TrainOperatingCompany[]) {
		this.timingPointLocationCode = darwinData.tpl

		this.computerReservationSystemCode = darwinData.crs ?? null
		if (darwinData.locname !== darwinData.tpl) this.name = darwinData.locname

		if (darwinData.toc) {
			const operator = operators.find(operator => operator.code === darwinData.toc)
			if (!operator) throw new Error(`Unknown operator '${darwinData.toc}'!`)

			this.operator = operator
		}

		this.isStation = this.name !== null && this.computerReservationSystemCode !== null
	}

	public toJson = (): LocationJson => ({
		name: this.name,
		timingPointLocationCode: this.timingPointLocationCode,
		computerReservationSystemCode: this.computerReservationSystemCode,
		operatorCode: this.operator?.code ?? null,
		isStation: this.isStation,
		coordinates: {
			latitude: null,
			longitude: null
		},
		address: {
			number: null,
			street: null,
			town: null,
			county: null,
			country: null,
			postcode: null
		}
	})
}
