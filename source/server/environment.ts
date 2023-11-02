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

export const NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION = getEnvironmentVariable<string>(
	"NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION",
	"eu-west-1"
)
export const NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET = getEnvironmentVariable<string>(
	"NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET",
	"darwin.xmltimetable"
)
export const NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX = getEnvironmentVariable<string>(
	"NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX",
	"PPTimetable"
)
export const NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY = getEnvironmentVariable<string>(
	"NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY"
)
export const NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY = getEnvironmentVariable<string>(
	"NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY"
)

export const REDIS_SERVER_ADDRESS = getEnvironmentVariable<string>("REDIS_SERVER_ADDRESS", "127.0.0.1")
export const REDIS_SERVER_PORT = getEnvironmentVariable<number>("REDIS_SERVER_PORT", 6379, 0, 65535)
export const REDIS_USE_TLS = getEnvironmentVariable<boolean>("REDIS_USE_TLS", false)
export const REDIS_AUTH_USER = getEnvironmentVariable<string>("REDIS_AUTH_USER", "default")
export const REDIS_AUTH_PASSWORD = getEnvironmentVariable<string>("REDIS_AUTH_PASSWORD")
export const REDIS_KEY_PREFIX = getEnvironmentVariable<string>("REDIS_KEY_PREFIX", "train")
export const REDIS_KEY_DELIMITER = getEnvironmentVariable<string>("REDIS_KEY_DELIMITER", ":")
export const REDIS_DATABASE = getEnvironmentVariable<number>("REDIS_DATABASE", 0, 0)

log.info("Ensured all environment variables are set.")
