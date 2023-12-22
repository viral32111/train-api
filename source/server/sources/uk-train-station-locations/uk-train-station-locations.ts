import log4js from "log4js"

const log = log4js.getLogger("darwin-push-port")

interface Station {
	"3alpha": string
	"station_name": string
	"latitude": number
	"longitude": number
}

/**
 * Fetches a list of stations with their GPS coordinates from the specified file URL.
 * @param fileUrl The URL of the file to fetch the station coordinates from.
 * @returns A promise that resolves to an array of stations with their GPS coordinates.
 * @since 0.1.0
 * @see https://github.com/ellcom/UK-Train-Station-Locations/blob/master/uk-train-stations.json
 * @example const stations = await fetchStationCoordinates()
 */
export const fetchStationCoordinates = async (
	fileUrl = "https://raw.githubusercontent.com/ellcom/UK-Train-Station-Locations/master/uk-train-stations.json"
): Promise<Station[]> => {
	const response = await fetch(fileUrl, {
		method: "GET",
		headers: {
			"Accept": "application/json",
			"User-Agent": "Train API v0.0.0" // TO-DO: Use the version from package.json
		}
	})

	if (!response.ok)
		throw new Error(
			`Received HTTP status code '${
				response.status
			}' when fetching station coordinates from '${fileUrl}': '${await response.text()}'`
		)

	const stations = (await response.json()) as Station[] | undefined

	if (!stations || !Array.isArray(stations))
		throw new Error(
			`Received invalid data (not an array?) when fetching station coordinates from '${fileUrl}': '${await response.text()})'`
		)

	if (stations.length <= 0)
		throw new Error(
			`Received an empty array when fetching station coordinates from '${fileUrl}': '${await response.text()}'`
		)

	return stations.filter(station => {
		if (!station["3alpha"] || typeof station["3alpha"] !== "string") {
			log.warn("Skipping station with invalid CRS: '%s'!", JSON.stringify(station))
			return false
		}

		if (!station.station_name || typeof station.station_name !== "string") {
			log.warn("Skipping station with invalid name: '%s'!", JSON.stringify(station))
			return false
		}

		if (!station.latitude || typeof station.latitude !== "number") {
			log.warn("Skipping station with invalid latitude: '%s'!", JSON.stringify(station))
			return false
		}

		if (!station.longitude || typeof station.longitude !== "number") {
			log.warn("Skipping station with invalid longitude: '%s'!", JSON.stringify(station))
			return false
		}

		return true
	})
}
