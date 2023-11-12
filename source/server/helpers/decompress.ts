import { deflate } from "zlib"

/**
 * Decompresses a buffer.
 * @param data The buffer to decompress.
 * @returns The decompressed buffer.
 * @since 0.1.0
 * @example decompress(Buffer.from("H4sIAAAAAAAAA/NIzcnJVwjPL8pJ4QIA4+WVsAwAAAA=", "base64")) // Buffer.from("Hello World")
 */
export const decompress = async (data: Buffer): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		deflate(data, (error, result) => {
			if (error) reject(error)
			else resolve(result)
		})
	})
}
