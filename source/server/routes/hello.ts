import { Status } from "../../shared/types/status"
import { router } from "../express"
import { packageVersion } from "../index"
import { BaseResponse } from "../types/response"

interface HelloResponse extends BaseResponse {
	data: {
		version: {
			major: number
			minor: number
			patch: number
		}
	}
}

router.get("/hello", (_, response) => {
	response.status(200).send({
		status: Status.Success,
		data: {
			version: packageVersion.toObject()
		}
	} as HelloResponse)
})
