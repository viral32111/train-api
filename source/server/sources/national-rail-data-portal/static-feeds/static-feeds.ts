import { writeFile } from "fs/promises"
import { join } from "path"

import log4js from "log4js"
import moment from "moment"

const log = log4js.getLogger("national-rail/static-feeds")

/**
 * The National Rail static feeds (.ZIP downloads).
 * These should be appended to the API base URL to form the full download URL.
 * @since 0.2.0
 */
export enum StaticFeeds {
	// DTD - Fares, Routeing Guide & Timetable - https://wiki.openraildata.com/DTD
	Fares = "2.0/fares",
	RouteingGuide = "2.0/routeing",
	TimeTable = "3.0/timetable",

	// KB - Knowledgebase - https://wiki.openraildata.com/KnowledgeBase
	NationalServiceIndicators = "4.0/serviceIndicators",
	Incidents = "5.0/incidents",
	TrainOperatingCompanies = "4.0/tocs",
	TicketRestrictions = "4.0/ticket-restrictions",
	TicketTypes = "4.0/ticket-types",
	PublicPromotions = "4.0/promotions-publics",
	Stations = "4.0/stations"
}

/**
 * Response data from the National Rail Data Portal authenticate route.
 * @since 0.2.0
 */
interface AuthenticationTokenResponse {
	username: string
	token: string
	roles: {
		ROLE_USER: boolean
		ROLE_DTD: boolean
	}
}

/**
 * Generates an authentication token for sending API requests to the National Rail Data Portal.
 * @param username The username (email address) to authenticate as.
 * @param password The password to authenticate as.
 * @param baseUrl The base URL of the National Rail Data Portal API.
 * @returns The newly generated authentication token.
 * @throws {Error} If the HTTP response is unsuccessful.
 * @throws {Error} If the username in the response does not match the username provided.
 * @see https://wiki.openraildata.com/DTD#Step_1:_Generate_Token
 * @since 0.2.0
 */
export const generateAuthenticationToken = async (
	username: string,
	password: string,
	baseUrl: string
): Promise<string> => {
	const url = new URL("/authenticate", baseUrl) // We want to override the existing path on the base URL
	log.debug("Authentication token URL is '%s'.", url.toString())

	const parameters = new URLSearchParams({
		username: username,
		password: password
	})
	log.debug("Authentication token body is '%s'.", parameters.toString())

	log.debug("Generating authentication token for '%s'...", username)
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: parameters
	})

	if (!response.ok)
		throw new Error(
			`Received HTTP status code ${response.status} when attempting to generate a National Rail Data Portal authentication token.`
		)

	const data = (await response.json()) as AuthenticationTokenResponse

	if (data.username !== username)
		throw new Error(
			`Received mismatching username '${data.username}' from the National Rail Data Portal authentication token response.`
		)

	log.debug("Generated authentication token '%s' for '%s'.", data.token, data.username)

	return data.token
}

/**
 * Fetches a static feed (.ZIP file) from the National Rail Data Portal.
 * @param staticFeed The static feed to fetch.
 * @param authenticationToken The authentication token to use.
 * @param baseUrl The base URL of the National Rail Data Portal API.
 * @returns The static feed (.ZIP file) as a buffer.
 * @throws {Error} If the HTTP response is unsuccessful.
 * @throws {Error} If the buffer is empty.
 * @see https://wiki.openraildata.com/DTD#Step_2:_Perform_a_HTTP_GET_call_for_each_file
 * @since 0.2.0
 */
export const fetchStaticFeed = async (
	staticFeed: StaticFeeds,
	authenticationToken: string,
	baseUrl: string
): Promise<Buffer> => {
	const response = await fetch(`${baseUrl}/${staticFeed.valueOf()}`, {
		headers: {
			"Accept": "*/*",
			"X-Auth-Token": authenticationToken
		}
	})

	if (!response.ok)
		throw new Error(
			`Received HTTP status code ${
				response.status
			} when attempting to fetch the '${staticFeed.valueOf()}' static feed.`
		)

	const arrayBuffer = await response.arrayBuffer()
	if (arrayBuffer.byteLength <= 0)
		throw new Error(
			`Received empty response when attempting to fetch the National Rail Data Portal '${staticFeed.valueOf()}' static feed.`
		)

	return Buffer.from(arrayBuffer)
}

/**
 * Downloads all static feeds from the National Rail Data Portal.
 * @param username The username (email address) to authenticate as.
 * @param password The password to authenticate as.
 * @param baseUrl The base URL of the National Rail Data Portal API.
 * @throws {Error} If any HTTP response is unsuccessful.
 * @since 0.2.0
 */
export const downloadStaticFeeds = async (username: string, password: string, baseUrl: string): Promise<void> => {
	const promises: Promise<void>[] = []

	const authenticationToken = await generateAuthenticationToken(username, password, baseUrl)

	for (const staticFeed of Object.values(StaticFeeds)) {
		log.debug("Downloading static feed '%s'...", staticFeed)
		promises.push(
			fetchStaticFeed(staticFeed, authenticationToken, baseUrl).then(async buffer => {
				log.debug("Fetched static feed '%s' (%d bytes).", staticFeed, buffer.length)

				const fileName = getFileName(staticFeed)
				const path = join("data", fileName)
				log.debug("Writing static feed '%s' (%d bytes) to '%s'...", staticFeed, buffer.length, path)
				await writeFile(path, buffer)

				log.info("Downloaded static feed '%s' (%d bytes) as '%s'.", staticFeed, buffer.length, fileName)
			})
		)
	}

	await Promise.all(promises)
}

/**
 * Gets the file name for a static feed (.ZIP file).
 * @param staticFeed The static feed to get the file name for.
 * @returns The file name for the static feed.
 * @since 0.2.0
 */
export const getFileName = (staticFeed: StaticFeeds): string =>
	`national-rail-data-portal-static-feeds-${staticFeed.valueOf().replace(/\//g, "-")}-${moment().format(
		"DD-MM-YYYY"
	)}.zip`
