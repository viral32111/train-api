import { Parser } from "xml2js"

// An explicitly-configured XML parser
export const parser = new Parser({
	strict: true,
	ignoreAttrs: false,
	explicitRoot: true,
	explicitArray: true,
	explicitChildren: true,
	normalizeTags: true,
	normalize: true,
	trim: true
})

/*
export const parse = <Type>(xml: Buffer, callback: (error: Error | null, result: Type) => void): void => {
	parser.parseString(xml, callback)
}*/

/**
 * Parses XML into a JavaScript object.
 * @param xml The XML to parse.
 * @returns The parsed object, casted to the type.
 * @since 0.1.0
 * @example parse(Buffer.from("<foo>bar</foo>")) // { foo: "bar" }
 */
export const parse = async <Type>(xml: string | Buffer): Promise<Type> => (await parser.parseStringPromise(xml)) as Type
