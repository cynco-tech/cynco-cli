export interface ExtractionResult {
	id: string;
	status: string;
	documentType?: string;
	fileName?: string;
	confidence?: number;
	data?: {
		vendorName?: string;
		customerName?: string;
		invoiceNumber?: string;
		date?: string;
		dueDate?: string;
		currency?: string;
		subtotal?: number;
		tax?: number;
		total?: number;
		lineItems?: Array<{
			description?: string;
			quantity?: number;
			unitPrice?: number;
			amount?: number;
		}>;
		[key: string]: unknown;
	};
}
