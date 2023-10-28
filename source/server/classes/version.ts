/**
 * The major, minor, and patch versions of a semantic version.
 * @since 0.1.0
 * @example { major: 1, minor: 2, patch: 3 }
 */
export class SemanticVersion {
	/**
	 * The major version.
	 * @since 0.1.0
	 * @example new SemanticVersion( 1, 2, 3 ).major // 1
	 */
	public readonly major: number = 0

	/**
	 * The minor version.
	 * @since 0.1.0
	 * @example new SemanticVersion( 1, 2, 3 ).minor // 2
	 */
	public readonly minor: number = 0

	/**
	 * The patch version.
	 * @since 0.1.0
	 * @example new SemanticVersion( 1, 2, 3 ).patch // 2
	 */
	public readonly patch: number = 0

	/**
	 * Creates a new semantic version.
	 * @param major The major version.
	 * @param minor The minor version.
	 * @param patch The patch version.
	 * @since 0.1.0
	 * @example new SemanticVersion( 1, 2, 3 )
	 */
	public constructor(major: number, minor: number, patch: number) {
		this.major = major
		this.minor = minor
		this.patch = patch
	}

	/**
	 * Converts the semantic version to a version string.
	 * @returns The semantic version as version string.
	 * @since 0.1.0
	 * @example new SemanticVersion( 1, 2, 3 ).toString() // "1.2.3"
	 */
	public toString = (): string => `${this.major}.${this.minor}.${this.patch}`

	/**
	 * Converts the semantic version to an object.
	 * @returns An object containing the major, minor, and patch versions.
	 * @since 0.1.0
	 * @example new SemanticVersion( 1, 2, 3 ).toObject() // { major: 1, minor: 2, patch: 3 }
	 */
	public toObject = (): { major: number; minor: number; patch: number } => ({
		major: this.major,
		minor: this.minor,
		patch: this.patch
	})

	/**
	 * Parses a version string as a semantic version.
	 * @param version The semantic version string to parse.
	 * @returns An object containing the major, minor, and patch versions.
	 * @throws An error when the version string is malformed.
	 * @throws An error when the versions in the string are missing.
	 * @throws An error when the versions in the string are not valid numbers.
	 * @since 0.1.0
	 * @example SemanticVersion.parseVersionString( "1.2.3" )
	 */
	public static parseVersionString(version: string): SemanticVersion {
		const patternMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
		if (!patternMatch) throw new Error(`Malformed semantic version '${version}'`)

		const majorVersion = patternMatch[1]
		const minorVersion = patternMatch[2]
		const patchVersion = patternMatch[3]
		if (!majorVersion) throw new Error(`Undefined semantic major version '${majorVersion}'`)
		if (!minorVersion) throw new Error(`Undefined semantic minor version '${minorVersion}'`)
		if (!patchVersion) throw new Error(`Undefined semantic patch version '${patchVersion}'`)

		const majorNumber = parseInt(majorVersion, 10)
		const minorNumber = parseInt(minorVersion, 10)
		const patchNumber = parseInt(patchVersion, 10)
		if (isNaN(majorNumber)) throw new Error(`Invalid semantic major version '${majorVersion}'`)
		if (isNaN(minorNumber)) throw new Error(`Invalid semantic minor version '${minorVersion}'`)
		if (isNaN(patchNumber)) throw new Error(`Invalid semantic patch version '${patchVersion}'`)

		return new this(majorNumber, minorNumber, patchNumber)
	}
}
