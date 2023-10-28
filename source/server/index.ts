import "source-map-support/register"

import log4js from "log4js"
import "./log"

import { EXPRESS_LISTEN_ADDRESS, EXPRESS_LISTEN_PORT, PACKAGE_FILE } from "./environment"
import { app, finaliseExpress } from "./express"
import { parsePackageVersion } from "./helpers/version"
import { experimentWithS3 } from "./sources/darwinPushPort"

const log = log4js.getLogger("main")

// Log all unhandled errors
process.on("uncaughtException", error => {
	log.fatal("%s: %s", error.name, error.message)
	if (error.stack != null) console.error(error.stack)

	process.exit(1)
})

// Get the package version
export const packageVersion = parsePackageVersion(PACKAGE_FILE, "0.0.0")
log.info("I am v%s.", packageVersion)

/*
const mongoUrl = `${MONGODB_SCHEME}://${MONGODB_SERVER_ADDRESS}:${MONGODB_SERVER_PORT}/${MONGODB_DATABASE}`
log.debug("Setting up Mongo client for '%s'...", mongoUrl)
export const mongoClient = new MongoClient(mongoUrl, {
	appName: `train-api/${version}`,
	directConnection: MONGODB_DIRECT_CONNECTION,
	authSource: MONGODB_AUTH_DATABASE,
	auth: {
		username: MONGODB_USER_NAME,
		password: MONGODB_USER_PASSWORD
	},
	retryWrites: true,
	retryReads: true,
	tls: false
})
export const mongoDatabase = mongoClient.db(MONGODB_DATABASE)
log.debug("Setup Mongo client.")
*/

log.debug("Starting Express...")
finaliseExpress(packageVersion)
export const httpServer = app.listen(EXPRESS_LISTEN_PORT, EXPRESS_LISTEN_ADDRESS, () => {
	log.info("Listening on http://%s:%d.", EXPRESS_LISTEN_ADDRESS, EXPRESS_LISTEN_PORT)

	/*
	log.debug("Connecting Mongo client to database...")
	await mongoClient.connect()
	await mongoDatabase.command({ ping: 1 })
	const mongoServerInformation = await mongoDatabase.admin().serverInfo()
	log.info("Connected to MongoDB server v%s.", mongoServerInformation["version"])
	*/

	if (process.argv.includes("--exit")) {
		log.debug("Stopping due to exit flag.")
		stopGracefully()
		return
	}

	experimentWithS3().catch(error => {
		log.fatal("Failed to experiment with S3! (%s)", error)
	})
})

const stopGracefully = (): void => {
	log.info("Stopping...")

	log.debug("Stopping Express...")
	httpServer.close(() => {
		log.info("Stopped Express.")

		/*
		log.debug("Closing Mongo client...")
		await mongoClient.close()
		log.info("Disconnected from MongoDB.")
		*/
	})
}

process.once("SIGINT", stopGracefully)
process.once("SIGTERM", stopGracefully)
