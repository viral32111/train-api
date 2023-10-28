import log4js from "log4js"

// Runtime environments
export const isProduction = process.env["NODE_ENV"] === "production"
export const isTest = process.env["NODE_ENV"] === "test"

// Configure logging
log4js.configure({
	appenders: { default: { type: "console" } },
	categories: {
		default: {
			appenders: ["default"],
			level: isProduction ? "info" : isTest ? "warn" : "trace"
		}
	}
})
