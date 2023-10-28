const path = require("path")

module.exports = {
	target: "node",
	mode: "development",
	entry: "./source/server/index.ts",
	output: {
		filename: "server.js",
		path: path.resolve(__dirname, "bundle"),
		module: true,
		chunkFormat: "module",
		environment: {
			module: true
		}
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
	experiments: {
		outputModule: true
	},
	devtool: "source-map"
}
