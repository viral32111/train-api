import log4js from "log4js"

/*
Cannot import from local files here as many of them attempt to create a log4js logger.
We don't want any loggers created before we configure log4js!
*/

export const isProduction = process.env["NODE_ENV"] === "production"
export const isTest = process.env["NODE_ENV"] === "test"
export const isDebug = !isProduction && !isTest

// Configure logging
log4js.configure({
	appenders: {
		console: {
			type: "stdout"
		},
		file: {
			type: "file",
			filename: "logs/server.log" // LOG_FILE_PATH
		}
	},
	categories: {
		default: {
			appenders: [!isTest ? "console" : "", "file"],
			level: isProduction ? "info" : isTest ? "warn" : "trace"
		}
	}
})
