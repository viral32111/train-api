import cors from "cors"
import express from "express"
import log4js from "log4js"

import { Status } from "../shared/types/status.js"
import { SemanticVersion } from "./classes/version.js"
import { EXPRESS_AUTHORIZATION_TOKEN, EXPRESS_MAX_REQUEST_SIZE } from "./environment.js"
import { ErrorResponse } from "./types/response.js"

const log = log4js.getLogger("express")
log.debug("Configuring Express...")

// Setup the Express application & router.
export const app = express()
export const router = express.Router()

// Parse JSON payloads
app.use(
	express.json({
		limit: EXPRESS_MAX_REQUEST_SIZE,
		type: "application/json",
		strict: true
	})
)

// Relax CORS policy
app.use(
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	cors({
		origin: "*",
		methods: ["GET", "OPTIONS"],
		allowedHeaders: ["Accept", "Content-Type", "Authorization", "User-Agent"]
	})
)

// Disable browser caching
app.set("etag", false)
app.use((_, response, next) => {
	response.set("Cache-Control", "no-store")
	next()
})

// Log incoming requests
if (log.isDebugEnabled())
	app.use((request, response, next) => {
		response.on("finish", () => {
			log.debug(
				"HTTP %s %s '%s' => %d %s",
				request.method,
				request.path,
				JSON.stringify(request.body),
				response.statusCode,
				response.statusMessage
			)
		})

		next()
	})

// Authentication
const expectedAuthorizationScheme = "Token"
app.use((request, response, next) => {
	const authorizationHeader = request.headers.authorization

	// Missing header
	if (!authorizationHeader) {
		response
			.status(401)
			.header("WWW-Authenticate", expectedAuthorizationScheme)
			.send({
				status: Status.InvalidAuthorizationHeader,
				data: {
					reason: "Missing Authorization HTTP request header"
				}
			} as ErrorResponse)

		return
	}

	const [scheme, value] = authorizationHeader.split(" ", 1)

	// Incorrect scheme
	if (scheme !== expectedAuthorizationScheme) {
		response
			.status(401)
			.header("WWW-Authenticate", expectedAuthorizationScheme)
			.send({
				status: Status.InvalidAuthorizationHeader,
				data: {
					reason: `Expected Authorization HTTP request header scheme to be '${expectedAuthorizationScheme}'`
				}
			} as ErrorResponse)

		return
	}

	// Incorrect value
	if (value !== EXPRESS_AUTHORIZATION_TOKEN) {
		response
			.status(401)
			.header("WWW-Authenticate", expectedAuthorizationScheme)
			.send({
				status: Status.BadAuthorization,
				data: {
					reason: "Invalid Authorization HTTP request header token"
				}
			} as ErrorResponse)

		return
	}

	next()
})

// Import routes
log.debug("Importing API routes...")
import("./routes/hello.js")

/**
 * Sets up the aspects of the Express application that require the package version.
 * @param packageVersion The package version.
 */
export const finaliseExpress = (packageVersion: SemanticVersion): void => {
	// Custom headers
	app.use((_, response, next) => {
		response.set("X-Powered-By", `Train API v${packageVersion.toString()}`)
		next()
	})

	// Redirect non-versioned requests the latest version prefix
	const apiBasePath = `/api/v${packageVersion.major}`
	app.use((request, response, next) => {
		const match = request.path.match(/^\/api\/(?!v\d)(.*)$/i)

		if (match?.[1]) {
			response.redirect(307, `${apiBasePath}/${match[1]}`)
			return
		}

		next()
	})

	// Redirect root to the latest version prefix
	app.get("/", (_, response) => {
		response.redirect(307, apiBasePath)
	})

	// Serve the routes on the versioned prefix
	app.use(apiBasePath, router)
	log.info("Serving API routes at '%s'.", apiBasePath)
}
