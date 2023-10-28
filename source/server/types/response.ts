/**
 * The structure of a response from the server.
 * @since 0.1.0
 */
export interface BaseResponse {
	status: number
	data: object
}

/**
 * The structure of an failed response from the server.
 * @since 0.1.0
 */
export interface ErrorResponse extends BaseResponse {
	data: {
		reason: string
	}
}
