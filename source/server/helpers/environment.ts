import log4js from "log4js"

const log = log4js.getLogger("environment")

/**
 * Gets an environment variable, or exits if it is not set or is otherwise invalid and no default value is provided.
 * @param Type The data type of the environment variable.
 * @param name The name of the environment variable.
 * @param defaultValue An optional fallback value when the environment variable is not set or is invalid.
 * @param minimumValue An optional minimum allowed value of the environment variable. Only applies to numbers.
 * @param maximumValue An optional maximum allowed value of the environment variable. Only applies to numbers.
 * @returns The value of the environment variable, or the default value if it is not set or is invalid.
 * @since 0.1.0
 * @example getEnvironmentVariable<string>( "NODE_ENV", "development" ) // "development"
 */
export const getEnvironmentVariable = <Type>(
	name: string,
	defaultValue?: Type,
	minimumValue?: number,
	maximumValue?: number
): Type => {
	const value = process.env[name]

	if (value === undefined && defaultValue === undefined)
		throw new Error(`Environment variable '${name}' is not set, and has no default value!`)

	if (!value && !defaultValue)
		throw new Error(
			`Environment variable '${name}' value '${value}' is malformed or invalid, and has no default value!`
		)

	if (!value) {
		log.warn(
			"Environment variable '%s' is not set or otherwise invalid, using default value '%s'.",
			name,
			defaultValue
		)

		return defaultValue as Type
	}

	switch (typeof defaultValue) {
		case "boolean":
			return value.toLowerCase() === "true" ? (true as Type) : (false as Type)
		case "number": {
			const number = parseInt(value, 10)

			if (isNaN(number)) throw new Error(`Environment variable '${name}' value '${value}' is not a valid number!`)

			if (minimumValue && number < minimumValue)
				throw new Error(
					`Environment variable '${name}' value '${value}' is less than minimum value '${minimumValue}'!`
				)

			if (maximumValue && number > maximumValue)
				throw new Error(
					`Environment variable '${name}' value '${value}' is greater than maximum value '${maximumValue}'!`
				)

			return number as Type
		}
		default:
			return value as Type
	}
}
