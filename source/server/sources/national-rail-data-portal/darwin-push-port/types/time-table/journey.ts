import { DestinationPoint, IntermediateCallingPoint, IntermediatePassingPoint, OriginPoint } from "./points.js"

export interface Journey {
	$: {
		rid: string // RTTI (Unique) Train Identifier
		uid: string // Train Unique Identifier
		trainId: string // Train Identifier (Headcode)
		toc: string // ATOC Code

		ssd: string // Scheduled Start Date

		status?: string // Type of service (train/bus/ship)
		trainCat?: string // Train category
		isPassengerSvc?: string // Is Passenger Service?
		qtrain?: string // Is this a Q train?

		can?: string // Is Cancelled?
		cancelReason?: string // Cancellation Reason
	}
	$$: {
		or?: { $: OriginPoint }[] // Origin Point
		opor?: { $: OriginPoint }[] // Operational Origin Point
		pp?: { $: IntermediatePassingPoint }[] // Intermediate Passing Point
		ip?: { $: IntermediateCallingPoint }[] // Intermediate Calling Point
		opip?: { $: IntermediateCallingPoint }[] // Operational Intermediate Calling Point
		dt?: { $: DestinationPoint }[] // Destination Point
		opdt?: { $: DestinationPoint }[] // Operational Destination Point
	}
}
