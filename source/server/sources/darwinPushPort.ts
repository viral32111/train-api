import { writeFile } from "fs/promises"
import { basename, extname } from "path"

import { GetObjectCommand, ListObjectsCommand, S3Client } from "@aws-sdk/client-s3"
import log4js from "log4js"
import gzip from "node-gzip"
import { createClient } from "redis"

import { Parser } from "xml2js"
import { TimeTable } from "../classes/journey.js"
import {
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY,
	REDIS_AUTH_PASSWORD,
	REDIS_AUTH_USER,
	REDIS_DATABASE,
	REDIS_KEY_DELIMITER,
	REDIS_KEY_PREFIX,
	REDIS_SERVER_ADDRESS,
	REDIS_SERVER_PORT,
	REDIS_USE_TLS
} from "../environment.js"

const log = log4js.getLogger("darwinPushPort")

log.debug("Creating XML parser...")
export const xmlParser = new Parser({
	strict: true,
	ignoreAttrs: false,
	explicitRoot: true,
	explicitArray: true,
	explicitChildren: true,
	normalizeTags: true,
	normalize: true,
	trim: true
})

log.debug("Creating S3 client for region '%s'...", NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION)
const s3 = new S3Client({
	region: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION,
	credentials: {
		accessKeyId: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY,
		secretAccessKey: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY
	}
})

log.debug("Creating Redis client for server '%s:%d'...", REDIS_SERVER_ADDRESS, REDIS_SERVER_PORT)
const redis = createClient({
	name: "train-api",
	socket: {
		host: REDIS_SERVER_ADDRESS,
		port: REDIS_SERVER_PORT,
		tls: REDIS_USE_TLS
	},
	username: REDIS_AUTH_USER,
	password: REDIS_AUTH_PASSWORD,
	database: REDIS_DATABASE
})

redis.once("ready", () => {
	log.debug("Redis client is ready.")
})

redis.once("error", (error: unknown) => {
	log.error("Redis client encountered an error! (%s)", error?.toString())
})

const formatRedisKey = (parts: string[] | string): string =>
	`${REDIS_KEY_PREFIX}${REDIS_KEY_DELIMITER}${Array.isArray(parts) ? parts.join(REDIS_KEY_DELIMITER) : parts}`

export const experimentWithS3 = async (): Promise<void> => {
	log.debug(
		"Listing objects in S3 bucket '%s' with prefix '%s'...",
		NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
		NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX
	)

	const listResponse = await s3.send(
		new ListObjectsCommand({
			Bucket: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
			Prefix: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX
		})
	)

	if (!listResponse.Contents) {
		log.error("Failed to list S3 objects!")
		return
	}

	log.debug("Found %d S3 object(s).", listResponse.Contents.length)

	listResponse.Contents.sort((a, b) => {
		if (!a.LastModified) return 1
		if (!b.LastModified) return -1

		return b.LastModified.getTime() - a.LastModified.getTime()
	})

	log.debug("Connecting to Redis...")
	await redis.connect()
	log.debug("Connected to Redis.")

	for (const object of listResponse.Contents) {
		if (!object.Key) {
			log.error("Found S3 object with no key!")
			continue
		}

		const fileName = basename(object.Key)
		log.debug("%s\t%s\t%s", fileName, object.Size, object.LastModified)

		const fileKey = basename(basename(fileName, ".gz"), ".xml")
		const dataFromRedis = await redis.get(formatRedisKey(["darwin-push-port", fileKey]))

		if (dataFromRedis) {
			log.debug("Skipping '%s' (%s) as it is already cached.", fileName, fileKey)
			continue
		}

		const downloadResponse = await s3.send(
			new GetObjectCommand({
				Bucket: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
				Key: object.Key
			})
		)

		if (!downloadResponse.Body) {
			log.error("Failed to download S3 object '%s'!", object.Key)
			continue
		}

		const dataAsBytes = await downloadResponse.Body.transformToByteArray()
		log.info("Downloaded '%s' (%d bytes).", fileName, dataAsBytes.length)

		let dataInBuffer: Buffer | null = null
		if (extname(fileName) === ".gz") {
			dataInBuffer = await gzip.ungzip(dataAsBytes)
			log.info("Decompressed '%s' (%d bytes).", fileName, dataInBuffer.length)
		} else {
			dataInBuffer = Buffer.from(dataAsBytes)
		}

		const dataAsBase64 = dataInBuffer.toString("base64")
		const redisSetResult = await redis.set(formatRedisKey(["darwin-push-port", fileKey]), dataAsBase64)
		log.debug("Cached '%s' (%s, %d bytes) in Redis (%s).", fileName, fileKey, dataAsBase64.length, redisSetResult)
	}

	const cachedKeysInRedis = await redis.keys(formatRedisKey(["darwin-push-port", "*"]))
	log.debug("Found %d cached key(s) in Redis: %s", cachedKeysInRedis.length, cachedKeysInRedis.join(", "))

	const latestTimetableKeyName = cachedKeysInRedis.find(key => key.match(/\d+_v8$/) !== null)
	const latestReferenceKeyName = cachedKeysInRedis.find(key => key.match(/\d+_ref_v4$/) !== null)
	if (!latestTimetableKeyName || !latestReferenceKeyName) {
		log.error("Failed to find latest timetable & reference files!")
		return
	}
	log.debug("Latest timetable key is '%s' & reference key is '%s'.", latestTimetableKeyName, latestReferenceKeyName)

	const latestTimetableFileContentAsBase64 = await redis.get(latestTimetableKeyName)
	if (!latestTimetableFileContentAsBase64) {
		log.error("Failed to find latest timetable file content in Redis!")
		return
	}

	const latestReferenceFileContentAsBase64 = await redis.get(latestReferenceKeyName)
	if (!latestReferenceFileContentAsBase64) {
		log.error("Failed to find latest reference file content in Redis!")
		return
	}

	const latestTimetableFileContent = Buffer.from(latestTimetableFileContentAsBase64, "base64")
	const latestReferenceFileContent = Buffer.from(latestReferenceFileContentAsBase64, "base64")
	log.debug(
		"Decoded latest timetable & reference file content (%d bytes, %d bytes).",
		latestTimetableFileContent.length,
		latestReferenceFileContent.length
	)

	await writeFile("data/latest-timetable.xml", latestTimetableFileContent)
	await writeFile("data/latest-reference.xml", latestReferenceFileContent)
	log.debug("Wrote latest timetable & reference files to disk.")

	log.debug("Disconnecting from Redis...")
	await redis.disconnect()
	log.debug("Disconnected from Redis.")

	const latestTimetable = await TimeTable.fromXML(latestTimetableFileContent)
	const latestReferenceFileData = (await xmlParser.parseStringPromise(latestReferenceFileContent)) as object
	log.debug("Parsed latest timetable & reference files (%d).", Object.keys(latestReferenceFileData).length)

	// const journeys = latestTimetable.getJourneysBetween("PADTLL", "PLYMTH")
	// log.debug("Found %d journey(s).", journeys.length)

	// for (const journey of journeys.slice(0, 100)) {
	// 	log.debug(journey.toString())
	// }

	// sort by departure time
	latestTimetable.journeys.sort((a, b) => {
		if (!a.originPoint.workingScheduledDepartureTime) return 1
		if (!b.originPoint.workingScheduledDepartureTime) return -1

		return a.originPoint.workingScheduledDepartureTime.unix() - b.originPoint.workingScheduledDepartureTime.unix()
	})

	//for (const journey of latestTimetable.journeys) log.debug(journey.toString())

	for (const journey of latestTimetable.journeys) {
		if (journey.isCancelled) continue
		//if (journey.isPassenger) continue

		const callingPoint = journey.getCallingPoint("PLYMTH")
		if (!callingPoint) continue

		log.debug(
			journey.toString(),
			"\t Platform",
			callingPoint.platform ?? "?",
			"@",
			callingPoint.workingScheduledDepartureTime?.format("HH:mm:ss") ??
				callingPoint.workingScheduledArrivalTime?.format("HH:mm:ss")
		)
	}

	// const journeys = latestTimetableFileData.PportTimetable.Journey
	// log.debug("Found %d journey(s).", journeys.length)

	// for (const journey of journeys.slice(0, 100)) {
	// 	log.debug(
	// 		journey["@_trainId"],
	// 		journey.OR["@_tpl"],
	// 		"@",
	// 		journey.OR["@_ptd"],
	// 		"->",
	// 		journey.DT["@_tpl"],
	// 		"@",
	// 		journey.DT["@_pta"]
	// 	)
	// }
}
