import { GetObjectCommand, ListObjectsCommand, S3Client } from "@aws-sdk/client-s3"
import { XMLParser } from "fast-xml-parser"
import { readFile, utimes, writeFile } from "fs/promises"
import log4js from "log4js"
import { ungzip } from "node-gzip"
import { basename, extname } from "path"
import { TimeTable } from "../classes/journey"
import {
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_BUCKET,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_OBJECT_PREFIX,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY
} from "../environment"
import { doesFileExist } from "../helpers/file"

const log = log4js.getLogger("darwinPushPort")

log.debug("Creating S3 client for region '%s'...", NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION)

const s3 = new S3Client({
	region: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_REGION,
	credentials: {
		accessKeyId: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_ACCESS_KEY,
		secretAccessKey: NATIONAL_RAIL_DARWIN_PUSH_PORT_S3_SECRET_KEY
	}
})

const xmlParser = new XMLParser({
	ignoreAttributes: false
})

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

	const savedFileNames = []

	for (const object of listResponse.Contents) {
		if (!object.Key) {
			log.error("Found S3 object with no key!")
			continue
		}

		const fileName = basename(object.Key)
		log.debug("%s\t%s\t%s", fileName, object.Size, object.LastModified)

		const alreadyExists = await doesFileExist(`/tmp/darwin/${fileName}`)
		if (alreadyExists) {
			log.warn("Skipping '%s' as it already exists.", fileName)
			savedFileNames.push(fileName)
			continue
		}

		const decompressedFileName = basename(fileName, ".gz")
		const decompressedAlreadyExists = await doesFileExist(`/tmp/darwin/${decompressedFileName}`)
		if (decompressedAlreadyExists) {
			log.warn("Skipping '%s' as it already exists.", decompressedFileName)
			savedFileNames.push(decompressedFileName)
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

		const data = await downloadResponse.Body.transformToByteArray()
		log.info("Downloaded '%s'.", fileName)

		let savedFileName = fileName

		if (extname(fileName) === ".gz") {
			const decompressedData = await ungzip(data)
			log.info("Decompressed '%s'.", fileName)

			savedFileName = decompressedFileName

			await writeFile(`/tmp/darwin/${savedFileName}`, decompressedData)
			if (object.LastModified)
				await utimes(`/tmp/darwin/${savedFileName}`, object.LastModified, object.LastModified)
			log.info("Saved '%s'.", savedFileName)
		} else {
			await writeFile(`/tmp/darwin/${fileName}`, data)
			if (object.LastModified) await utimes(`/tmp/darwin/${fileName}`, object.LastModified, object.LastModified)
		}

		savedFileNames.push(savedFileName)
		log.info("Saved '%s'.", savedFileName)
	}

	const latestTimetableFileName = savedFileNames.find(fileName => fileName.match(/^\d+_v8.xml$/) !== null)
	const latestReferenceFileName = savedFileNames.find(fileName => fileName.match(/^\d+_ref_v4.xml$/) !== null)
	if (!latestTimetableFileName || !latestReferenceFileName) {
		log.error("Failed to find latest timetable & reference files!")
		return
	}
	log.debug(
		"Latest timetable file is '%s' & reference file is '%s'.",
		latestTimetableFileName,
		latestReferenceFileName
	)

	const latestTimetableFileContent = await readFile(`/tmp/darwin/${latestTimetableFileName}`)
	const latestReferenceFileContent = await readFile(`/tmp/darwin/${latestReferenceFileName}`)

	const latestTimetable = new TimeTable(latestTimetableFileContent)
	const latestReferenceFileData = xmlParser.parse(latestReferenceFileContent) as object
	log.debug("Parsed latest timetable & reference files (%d).", Object.keys(latestReferenceFileData).length)

	const journeys = latestTimetable.getJourneysBetween("PADTLL", "PLYMTH")
	log.debug("Found %d journey(s).", journeys.length)

	for (const journey of journeys.slice(0, 100)) {
		log.debug(journey.toString())
	}

	/*
	for (const journey of latestTimetable) {
		if (journey.isPassenger) continue

		const callingPoint = journey.getCallingPoint("PLYMTH")
		if (!callingPoint) continue

		log.debug(
			journey.toString(),
			"\t Platform",
			callingPoint.platform,
			"@",
			callingPoint.workingScheduledDepartureTime?.format("HH:mm:ss")
		)
	}
	*/

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
