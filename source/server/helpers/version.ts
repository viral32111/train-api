import { readFileSync } from "fs"

import { SemanticVersion } from "../classes/version.js"

/**
 * Extracts the semantic version from a package.json file.
 * Errors will only be thrown when the package.json file cannot be parsed and a fallback is not provided.
 * @param path The path to the package.json file.
 * @param fallback An optional version to use if the package.json file cannot be parsed.
 * @returns The semantic version from the package.json file.
 * @throws An error when the package.json file is empty.
 * @throws An error when the package.json file is malformed.
 * @since 0.1.0
 * @example parsePackageVersion( "./package.json" ) // { major: 1, minor: 2, patch: 3 }
 */
export const parsePackageVersion = (path: string, fallback?: string): SemanticVersion => {
	try {
		const fileContents = readFileSync(path, "utf-8")
		if (fileContents.length <= 0) throw new Error(`The package file '${path}' is empty`)

		const fileData = JSON.parse(fileContents) as { version: string } | undefined
		if (!fileData) throw new Error(`The package file '${path}' is malformed`)

		return SemanticVersion.parseVersionString(fileData.version)
	} catch (error) {
		if (fallback) return SemanticVersion.parseVersionString(fallback)

		throw error
	}
}
