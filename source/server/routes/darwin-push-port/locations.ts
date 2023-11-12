import { Status } from "../../../package/index.js"
import { getTimeTable } from "../../classes/darwin-push-port.js"
import { router } from "../../express.js"
import { BaseResponse, ErrorResponse } from "../../types/response.js"

type Filter = "station" | null

interface LocationsResponse extends BaseResponse {
	data: {
		filter: Filter
		locations: {
			tiploc: string
			crs: string | null
			name: string | null
			operator: string | null
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
		}[]
	}
}

router.get("/locations", (request, response) => {
	const query = request.query as { filter: Filter }

	const timeTable = getTimeTable()
	if (!timeTable)
		return response.status(503).send({
			status: Status.LoadingDarwinPushPortTimeTable,
			data: {
				reason: "Still loading Darwin Push Port time-table. Try again later."
			}
		} as ErrorResponse)

	// TODO

	return response.status(501).send({
		status: Status.NotImplementedYet,
		data: {
			filter: query.filter,
			locations: []
		}
	} as LocationsResponse)
})
