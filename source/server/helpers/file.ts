import { stat } from "fs/promises"

export const doesFileExist = async (path: string): Promise<boolean> => {
	try {
		const stats = await stat(path)
		return stats.isFile()
	} catch {
		return false
	}
}
