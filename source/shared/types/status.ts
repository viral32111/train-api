/**
 * The status codes used in API responses.
 * @since 0.1.0
 */
export enum Status {
	Success = 0,

	InvalidAuthorizationHeader = 1,
	BadAuthorization = 2,

	NotImplementedYet = 3,

	LoadingDarwinPushPortTimeTable = 4,

	InvalidQueryParameterValue = 5,
	OmitEmptyQueryParameters = 6
}
