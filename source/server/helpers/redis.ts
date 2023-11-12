import { REDIS_KEY_DELIMITER, REDIS_KEY_PREFIX } from "../environment.js"

/**
 * Creates a Redis key from parts.
 * @param parts The parts to join.
 * @param prefix The prefix to use.
 * @param delimiter The delimiter to use.
 * @returns The Redis key.
 * @since 0.1.0
 * @example createKey(["foo", "bar"], "train-api", ":") // "train-api:darwin-push-port:foo:bar"
 */
export const createKey = (
	parts: string[] | string,
	prefix = REDIS_KEY_PREFIX,
	delimiter = REDIS_KEY_DELIMITER
): string => `${prefix}${delimiter}${Array.isArray(parts) ? parts.join(delimiter) : parts}`

/**
 * Splits a Redis key into parts.
 * Optionally removes the prefix.
 * @param key The key to split.
 * @param removePrefix Whether to remove the prefix.
 * @param prefix The prefix to use.
 * @param delimiter The delimiter to use.
 * @return The parts of the key.
 * @since 0.1.0
 * @example splitKey("train-api:darwin-push-port:foo:bar", true, "train-api", ":") // ["foo", "bar"]
 */
export const splitKey = (
	key: string,
	removePrefix = false,
	prefix = REDIS_KEY_PREFIX,
	delimiter = REDIS_KEY_DELIMITER
): string[] => {
	if (removePrefix) key = key.replace(new RegExp(prefix, "y"), "")
	return key.split(delimiter)
}
