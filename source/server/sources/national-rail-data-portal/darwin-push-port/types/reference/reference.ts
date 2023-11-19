import { CIS } from "./cis.js"
import { LoadingCategory } from "./loading-category.js"
import { Location } from "./location.js"
import { Reason } from "./reason.js"
import { TrainOperatingCompany } from "./toc.js"
import { Via } from "./via.js"

export interface Reference {
	pporttimetableref: {
		$: {
			timetableId: string
		}
		$$: {
			locationref: { $: Location }[] // TIPLOC to CRS/name
			tocref: { $: TrainOperatingCompany }[] // TOC code to name
			laterunningreasons: { $$: { reason: Reason[] } } // Late running reason code to text
			cancellationreasons: { $$: { reason: Reason[] } } // Cancellation reason code to text
			via: { $: Via[] } // Vias
			cissource: { $: CIS[] } // CIS source codes to names
			loadingcategories: { $$: { category: LoadingCategory[] } } // Loading categories
		}
	}
}
