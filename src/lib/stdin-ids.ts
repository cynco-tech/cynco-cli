/**
 * Parses IDs from various stdin formats for pipe chain support.
 *
 * Supports:
 * 1. Line-separated plain IDs (one per line)
 * 2. JSON array of strings: ["inv_001", "inv_002"]
 * 3. JSON array of objects: [{"id":"inv_001"}, {"invoiceId":"inv_002"}] — extracts first ID-like field
 * 4. NDJSON (newline-delimited JSON objects): {"id":"inv_001"}\n{"id":"inv_002"}
 * 5. JSON object with array data: {"invoices":[{"id":"inv_001"}]} — extracts from first array field
 *
 * This enables: cynco invoices list --json | cynco invoices batch-send --stdin
 */
export function parseStdinIds(content: string): string[] {
	const trimmed = content.trim();
	if (!trimmed) return [];

	// Try parsing as JSON first
	try {
		const parsed = JSON.parse(trimmed);

		// JSON array of strings
		if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
			return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
		}

		// JSON array of objects — extract ID fields
		if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
			return extractIdsFromObjects(parsed);
		}

		// JSON object with array property (e.g. API response with data wrapper)
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			for (const value of Object.values(parsed)) {
				if (Array.isArray(value) && value.length > 0) {
					if (typeof value[0] === 'string') {
						return value.filter(
							(item): item is string => typeof item === 'string' && item.length > 0,
						);
					}
					if (typeof value[0] === 'object') {
						return extractIdsFromObjects(value);
					}
				}
			}
		}
	} catch {
		// Not JSON — try NDJSON or line-separated
	}

	// Try NDJSON (each line is a JSON object)
	const lines = trimmed
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	if (lines.length > 0 && lines[0]?.startsWith('{')) {
		try {
			const objects = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
			return extractIdsFromObjects(objects);
		} catch {
			// Not valid NDJSON
		}
	}

	// Plain line-separated IDs (strip quotes, skip comments)
	return lines.filter((l) => !l.startsWith('#')).map((l) => l.replace(/^["']|["']$/g, ''));
}

const ID_FIELD_NAMES = [
	'id',
	'invoiceId',
	'customerId',
	'vendorId',
	'billId',
	'itemId',
	'webhookId',
	'entryId',
];

function extractIdsFromObjects(objects: unknown[]): string[] {
	const ids: string[] = [];
	for (const obj of objects) {
		if (typeof obj !== 'object' || obj === null) continue;
		const record = obj as Record<string, unknown>;
		for (const field of ID_FIELD_NAMES) {
			if (typeof record[field] === 'string' && record[field]) {
				ids.push(record[field] as string);
				break;
			}
		}
	}
	return ids;
}
