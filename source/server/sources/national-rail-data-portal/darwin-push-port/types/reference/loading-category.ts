export interface LoadingCategory {
	$: {
		Code: string // Loading category code
		Name: string // Human-readable message
		Toc?: string // TOC (operator) code
	}
	$$: {
		typicaldescription: string[]
		expecteddescription: string[]
		definition: string[]
		colour?: string[]
		image?: string[]
	}
}
