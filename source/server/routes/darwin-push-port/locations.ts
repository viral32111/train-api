import { Router } from "express"
import { Status } from "../../../package/index.js"
import { LocationJson } from "../../classes/location.js"
import { getTimeTable } from "../../state.js"
import { BaseResponse, ErrorResponse } from "../../types/response.js"

interface LocationsResponse extends BaseResponse {
	data: {
		type: string
		locations: LocationJson[]
	}
}

export const registerRoutes = (expressRouter: Router): void => {
	expressRouter.get("/locations", (request, response) => {
		const query = request.query as { type?: string }

		const timeTable = getTimeTable()
		if (!timeTable)
			return response.status(503).send({
				status: Status.LoadingDarwinPushPortTimeTable,
				data: {
					reason: "Initially loading Darwin Push Port time-table, try again soon."
				}
			} as ErrorResponse)

		let locations = timeTable.locations
		if (query.type === "station") locations = locations.filter(location => location.isStation)
		else if (query.type === "")
			return response.status(400).send({
				status: Status.OmitEmptyQueryParameters,
				data: {
					reason: "Omit query parameter 'type' with empty value."
				}
			} as ErrorResponse)
		else if (query.type !== undefined)
			return response.status(400).send({
				status: Status.InvalidQueryParameterValue,
				data: {
					reason: `Value '${query.type}' is not valid for query parameter 'type'.`
				}
			} as ErrorResponse)

		return response.status(501).send({
			status: Status.NotImplementedYet,
			data: {
				type: query.type,
				locations: locations.map(location => location.toJson())
			}
		} as LocationsResponse)
	})
}
