import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

import { config as dotenv } from "dotenv"
import log4js from "log4js"

import { getEnvironmentVariable } from "./helpers/environment"

const log = log4js.getLogger("environment")

const currentDirectory = dirname(fileURLToPath(import.meta.url))
log.debug("In directory '%s'.", currentDirectory)

log.debug("Loading environment variables file...")
const dotenvResult = dotenv()
if (dotenvResult.error ?? !dotenvResult.parsed) {
	log.debug("Failed to load environment variables file! (%s)", dotenvResult.error?.message ?? "Unknown")
} else {
	log.debug("Loaded %d environment variables.", Object.keys(dotenvResult.parsed).length)
}

log.debug("Ensuring all environment variables are set...")
export const PACKAGE_FILE = getEnvironmentVariable<string>("PACKAGE_FILE", resolve(currentDirectory, "package.json"))
export const EXPRESS_LISTEN_ADDRESS = getEnvironmentVariable<string>("EXPRESS_LISTEN_ADDRESS", "0.0.0.0")
export const EXPRESS_LISTEN_PORT = getEnvironmentVariable<number>("EXPRESS_LISTEN_PORT", 3000, 0, 65535)
export const EXPRESS_MAX_REQUEST_SIZE = getEnvironmentVariable<number>("EXPRESS_MAX_REQUEST_SIZE", 1024 * 1024 * 1, 0)
export const EXPRESS_AUTHORIZATION_TOKEN = getEnvironmentVariable<string>("EXPRESS_AUTHORIZATION_TOKEN")

export const NATIONAL_RAIL_DATA_PORTAL_USER = getEnvironmentVariable<string>("NATIONAL_RAIL_DATA_PORTAL_USER")
export const NATIONAL_RAIL_DATA_PORTAL_PASSWORD = getEnvironmentVariable<string>("NATIONAL_RAIL_DATA_PORTAL_PASSWORD")
export const NATIONAL_RAIL_STATIC_FEEDS_API_BASE_URL = getEnvironmentVariable<string>(
	"NATIONAL_RAIL_STATIC_FEEDS_API_BASE_URL",
	"https://opendata.nationalrail.co.uk/api/staticfeeds"
)
log.info("Ensured all environment variables are set.")
