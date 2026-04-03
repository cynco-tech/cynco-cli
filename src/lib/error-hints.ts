/**
 * Maps API field names (camelCase) to CLI flag suggestions.
 * Used to generate helpful hints when the API returns validation errors.
 */
const FIELD_TO_FLAG: Record<string, string> = {
	// Common identifiers
	customerId: '--customer-id <id>',
	vendorId: '--vendor-id <id>',
	accountId: '--account-id <id>',
	invoiceId: '--invoice-id <id>',
	billId: '--bill-id <id>',
	itemId: '--item-id <id>',

	// Dates
	dueDate: '--due-date <YYYY-MM-DD>',
	issueDate: '--issue-date <YYYY-MM-DD>',
	startDate: '--start-date <YYYY-MM-DD>',
	endDate: '--end-date <YYYY-MM-DD>',
	date: '--date <YYYY-MM-DD>',
	from: '--from <YYYY-MM-DD>',
	to: '--to <YYYY-MM-DD>',

	// Amounts & currency
	amount: '--amount <number>',
	unitPrice: '--unit-price <number>',
	quantity: '--quantity <number>',
	currency: '--currency <code>',
	taxRate: '--tax-rate <number>',

	// Common fields
	name: '--name <text>',
	email: '--email <address>',
	description: '--description <text>',
	status: '--status <value>',
	type: '--type <value>',
	url: '--url <url>',
	phone: '--phone <number>',
	address: '--address <text>',
	reference: '--reference <text>',
	notes: '--notes <text>',

	// Webhook-specific
	events: '--events <event1,event2>',
	secret: '--secret <value>',
};

export type ErrorDetail = { field: string; message: string };
export type ErrorHint = { field: string; message: string; flag?: string };

/**
 * Enriches API error details with CLI flag hints.
 */
export function enrichErrorDetails(details: ErrorDetail[]): ErrorHint[] {
	return details.map((d) => {
		const flag = FIELD_TO_FLAG[d.field];
		return flag ? { ...d, flag } : d;
	});
}

/**
 * Formats error details as human-readable hint lines for stderr.
 */
export function formatErrorHints(details: ErrorDetail[]): string[] {
	const enriched = enrichErrorDetails(details);
	return enriched.map((h) => {
		if (h.flag) {
			return `  ${h.field}: ${h.message} \u2014 try: ${h.flag}`;
		}
		return `  ${h.field}: ${h.message}`;
	});
}
