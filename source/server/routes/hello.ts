import { Status } from "../../shared/types/status.js"
import { router } from "../express.js"
import { packageVersion } from "../index.js"
import { BaseResponse } from "../types/response.js"

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
