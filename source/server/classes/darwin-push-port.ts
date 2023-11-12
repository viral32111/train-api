import { writeFile } from "fs/promises"
import { basename, extname } from "path"

import { GetObjectCommand, ListObjectsCommand, S3Client } from "@aws-sdk/client-s3"
import log4js from "log4js"
import moment from "moment"
import { createClient } from "redis"

import {
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY,
	REDIS_AUTH_PASSWORD,
	REDIS_AUTH_USER,
	REDIS_DATABASE,
	REDIS_SERVER_ADDRESS,
	REDIS_SERVER_PORT,
	REDIS_USE_TLS
} from "../environment.js"
import { decompress } from "../helpers/decompress.js"
import { createKey, splitKey } from "../helpers/redis.js"
import { TimeTable } from "./timetable.js"

// Why is the Redis client type so complicated?!
type RedisClient = ReturnType<typeof createClient>

const log = log4js.getLogger("darwin-push-port")

let timeTable: TimeTable | null = null
export const getTimeTable = (): TimeTable | null => timeTable

/**
 * Refreshes all timetable data from Darwin Push Port.
 */
export const refresh = async (): Promise<void> => {
	const { s3, redis } = await createClients(
		{
			region: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION,
			accessKey: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY,
			secretKey: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY
		},
		{
			server: {
				address: REDIS_SERVER_ADDRESS,
				port: REDIS_SERVER_PORT,
				tls: REDIS_USE_TLS
			},
			user: {
				name: REDIS_AUTH_USER,
				password: REDIS_AUTH_PASSWORD
			},
			database: REDIS_DATABASE
		}
	)

	const redisKeyNamespace = "darwin-push-port"

	log.debug("Caching S3 objects...")
	await cacheS3ObjectsInRedis(
		s3,
		redis,
		NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
		NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX,
		redisKeyNamespace
	)
	log.info("Cached S3 objects.")

	log.debug("Creating timetable...")
	timeTable = await createTimeTableFromRedis(redis, redisKeyNamespace)
	log.info("Created timetable.")

	log.debug("Cleaning up Redis client...")
	await redis.disconnect()
	log.info("Cleaned up Redis client.")

	log.debug("Cleaning up S3 client...")
	s3.destroy()
	log.info("Cleaned up S3 client.")
}

/**
 * Finds the latest timetable & reference files in Redis & creates a timetable from them.
 * @param redis The Redis client.
 * @param redisKeyNamespace The namespace to use for Redis keys.
 * @param redisKeyDelimiter The delimiter to use for Redis keys.
 * @returns
 */
const createTimeTableFromRedis = async (
	redis: RedisClient,
	redisKeyNamespace = "darwin-push-port"
): Promise<TimeTable> => {
	log.debug("Finding keys in Redis...")
	const redisKeys = await redis.keys(createKey([redisKeyNamespace, "*"]))
	log.debug("Found %d key(s) in Redis.", redisKeys.length)

	log.debug("Splitting keys into parts...")
	const darwinObjectNames = redisKeys.map(key => {
		const keyParts = splitKey(key, true)
		if (keyParts.length < 2 || !keyParts[1]) throw new Error("Failed to split Redis key!")

		return keyParts[1]
	})

	log.debug("Sorting %d Darwin Push Port object(s) by name...", redisKeys.length)
	darwinObjectNames.sort((a, b) => {
		const aDate = moment(a, "YYYYMMDDHHmmss")
		const bDate = moment(b, "YYYYMMDDHHmmss")

		return bDate.unix() - aDate.unix()
	})

	const latestTimeTableName = darwinObjectNames.find(name => name.match(/\d+_v8$/))
	const latestReferenceName = darwinObjectNames.find(key => key.match(/\d+_ref_v4$/))
	if (!latestTimeTableName || !latestReferenceName)
		throw new Error("Failed to find latest timetable & reference objects!")
	log.debug(
		"Latest time-table name is '%s' & latest reference name is '%s'.",
		latestTimeTableName,
		latestReferenceName
	)

	const latestTimeTableXML = await redis.get(latestTimeTableName)
	if (!latestTimeTableXML) throw new Error("Failed to fetch latest timetable XML in Redis!")

	const latestReferenceXML = await redis.get(latestReferenceName)
	if (!latestReferenceXML) throw new Error("Failed to fetch latest reference XML in Redis!")

	// Temporary to aid debugging
	await writeFile("data/latest-timetable.xml", latestTimeTableXML)
	await writeFile("data/latest-reference.xml", latestReferenceXML)
	log.debug("Wrote latest timetable & reference files to disk.")

	return await TimeTable.parse(latestTimeTableXML, latestReferenceXML)
}

/**
 * Caches all S3 objects in Redis.
 * @param s3 The S3 client.
 * @param redis The Redis client.
 * @param redisKeyNamespace The namespace to use for Redis keys.
 * @param skipCacheCheck Whether to skip checking if the S3 object is already cached.
 */
const cacheS3ObjectsInRedis = async (
	s3: S3Client,
	redis: RedisClient,
	s3BucketName: string,
	s3ObjectPrefix?: string,
	redisKeyNamespace = "darwin-push-port",
	skipCacheCheck = false
): Promise<void> => {
	log.debug("Listing objects with prefix '%s' in S3 bucket '%s'...", s3ObjectPrefix, s3BucketName)
	const listS3ObjectsResponse = await s3.send(
		new ListObjectsCommand({
			Bucket: s3BucketName,
			Prefix: s3ObjectPrefix
		})
	)
	if (!listS3ObjectsResponse.Contents) throw new Error("Failed to list S3 objects!")

	log.debug("Sorting %d S3 object(s) by last modified time...", listS3ObjectsResponse.Contents.length)
	const s3Objects = listS3ObjectsResponse.Contents
	s3Objects.sort((a, b) => {
		if (!a.LastModified) return 1
		if (!b.LastModified) return -1

		return b.LastModified.getTime() - a.LastModified.getTime()
	})

	for (const s3Object of s3Objects) {
		if (!s3Object.Key) {
			log.warn("Skipping download of S3 object with no key!")
			continue
		}

		const isCompressed = extname(s3Object.Key) === ".gz"
		const fileNameWithoutCompressionExtension = basename(s3Object.Key, ".gz")

		const isXML = extname(fileNameWithoutCompressionExtension) === ".xml"
		const fileNameWithoutXMLExtension = basename(fileNameWithoutCompressionExtension, ".xml")
		if (!isXML) {
			log.warn("Skipping download of S3 object '%s' as it is not an XML file!", s3Object.Key)
			continue
		}

		if (!skipCacheCheck) {
			log.debug("Checking if S3 object '%s' is cached...", s3Object.Key)

			if (s3Object.ETag) {
				const cachedETag = await redis.get(createKey([redisKeyNamespace, fileNameWithoutXMLExtension, "etag"]))
				if (cachedETag) {
					if (cachedETag === s3Object.ETag) {
						log.debug(
							"Skipping download of S3 object '%s' as it is already cached (e-tag matches).",
							s3Object.Key
						)
						continue
					}
				} else log.warn("Cached S3 object '%s' does not have an e-tag!", s3Object.Key)
			} else log.warn("Cannot check cache of S3 object '%s' via e-tag!", s3Object.Key)

			const isCachedInRedis = await redis.get(createKey([redisKeyNamespace, fileNameWithoutXMLExtension]))
			if (isCachedInRedis) {
				log.debug("Skipping download of S3 object '%s' as it is already cached (key exists).", s3Object.Key)
				continue
			}
		} else log.debug("Skipping cache check of S3 object '%s'.", s3Object.Key)

		log.debug("Downloading S3 object '%s'...", s3Object.Key)
		const downloadS3ObjectResponse = await s3.send(
			new GetObjectCommand({
				Bucket: s3BucketName,
				Key: s3Object.Key
			})
		)
		if (!downloadS3ObjectResponse.Body) {
			log.warn("Skipping caching of S3 object '%s' as it failed to download!", s3Object.Key)
			continue
		}

		const s3ObjectBytes = await downloadS3ObjectResponse.Body.transformToByteArray()
		let s3ObjectBuffer = Buffer.from(s3ObjectBytes)
		log.debug("Downloaded S3 object '%s' (%d bytes).", s3Object.Key, s3ObjectBytes.length)

		if (isCompressed) {
			s3ObjectBuffer = await decompress(s3ObjectBuffer)
			log.info("Decompressed S3 object '%s' (%d bytes).", s3Object.Key, s3ObjectBuffer.length)
		}

		const s3ObjectUTF8 = s3ObjectBuffer.toString("utf8")
		log.debug("Decoded S3 object '%s' as UTF-8 (%d bytes).", s3Object.Key, s3ObjectUTF8.length)

		await redis.set(createKey([redisKeyNamespace, fileNameWithoutXMLExtension]), s3ObjectUTF8)
		await redis.expire(createKey([redisKeyNamespace, fileNameWithoutXMLExtension]), 60 * 60 * 24) // 24 hours
		log.debug("Cached S3 object '%s' in Redis.", s3Object.Key)
	}
}

/**
 * Creates the S3 & Redis clients.
 * @param s3Options Options for the S3 client.
 * @param redisOptions Options for the Redis client.
 * @param clientName The name to identify the clients as.
 * @returns The S3 & Redis clients.
 */
const createClients = async (
	s3Options: {
		region: string
		accessKey: string
		secretKey: string
	},
	redisOptions: {
		server: {
			address: string
			port: number
			tls: boolean
		}
		user: {
			name: string
			password: string
		}
		database: number
	},
	clientName = "train-api"
): Promise<{
	s3: S3Client
	redis: RedisClient
}> => {
	// Create S3 client
	log.debug("Creating S3 client for region '%s'...", s3Options.region)
	const s3Client = new S3Client({
		region: s3Options.region,
		credentials: {
			accessKeyId: s3Options.accessKey,
			secretAccessKey: s3Options.secretKey
		}
	})

	// Create Redis client
	log.debug("Creating Redis client for server '%s:%d'...", redisOptions.server.address, redisOptions.server.port)
	const redisClient = createClient({
		name: clientName,
		socket: {
			host: redisOptions.server.address,
			port: redisOptions.server.port,
			tls: redisOptions.server.tls
		},
		username: redisOptions.user.name,
		password: redisOptions.user.password,
		database: redisOptions.database
	})

	// Setup Redis client event handlers
	log.debug("Registering Redis client event handlers...")
	redisClient.once("ready", () => {
		log.debug("Redis client is ready.")
	})
	redisClient.once("error", (error: unknown) => {
		log.error("Redis client encountered an error! (%s)", error?.toString())
	})
	redisClient.once("end", () => {
		log.debug("Redis client has finished.")
	})

	// Connect Redis client
	log.debug("Connecting Redis client...")
	await redisClient.connect()
	log.debug("Connected Redis client.")

	return {
		s3: s3Client,
		redis: redisClient
	}
}