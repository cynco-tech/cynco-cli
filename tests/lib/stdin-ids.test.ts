import { describe, expect, test } from 'vitest';
import { parseStdinIds } from '../../src/lib/stdin-ids';

describe('parseStdinIds', () => {
	// ── JSON array of strings ───────────────────────────────────────
	test('parses JSON array of string IDs', () => {
		const ids = parseStdinIds('["inv_001", "inv_002", "inv_003"]');
		expect(ids).toEqual(['inv_001', 'inv_002', 'inv_003']);
	});

	test('filters empty strings from JSON string arrays', () => {
		const ids = parseStdinIds('["inv_001", "", "inv_002"]');
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	// ── JSON array of objects ───────────────────────────────────────
	test('extracts id field from JSON array of objects', () => {
		const ids = parseStdinIds('[{"id":"inv_001"}, {"id":"inv_002"}]');
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('extracts invoiceId when id field is absent', () => {
		const ids = parseStdinIds('[{"invoiceId":"inv_001"}]');
		expect(ids).toEqual(['inv_001']);
	});

	test('extracts customerId field from customer objects', () => {
		const ids = parseStdinIds('[{"customerId":"cust_001"}]');
		expect(ids).toEqual(['cust_001']);
	});

	test('prefers id over invoiceId when both exist', () => {
		const ids = parseStdinIds('[{"id":"primary", "invoiceId":"secondary"}]');
		expect(ids).toEqual(['primary']);
	});

	test('skips objects with no recognized ID field', () => {
		const ids = parseStdinIds('[{"name":"Acme"}, {"id":"inv_001"}]');
		expect(ids).toEqual(['inv_001']);
	});

	test('skips objects where id field is empty string', () => {
		const ids = parseStdinIds('[{"id":""}, {"id":"inv_001"}]');
		expect(ids).toEqual(['inv_001']);
	});

	// ── Wrapped API response ────────────────────────────────────────
	test('extracts IDs from wrapped API response with array property', () => {
		const input = JSON.stringify({
			invoices: [{ id: 'inv_001' }, { id: 'inv_002' }],
			pagination: { page: 1 },
		});
		const ids = parseStdinIds(input);
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('extracts string array from wrapped API response', () => {
		const input = JSON.stringify({
			ids: ['inv_001', 'inv_002'],
		});
		const ids = parseStdinIds(input);
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('returns empty for wrapped response with no array properties', () => {
		const input = JSON.stringify({ count: 5, status: 'ok' });
		const ids = parseStdinIds(input);
		expect(ids).toEqual([]);
	});

	// ── NDJSON ──────────────────────────────────────────────────────
	test('parses NDJSON (newline-delimited JSON objects)', () => {
		const input = '{"id":"inv_001"}\n{"id":"inv_002"}\n{"id":"inv_003"}';
		const ids = parseStdinIds(input);
		expect(ids).toEqual(['inv_001', 'inv_002', 'inv_003']);
	});

	test('handles NDJSON with trailing newline', () => {
		const input = '{"id":"inv_001"}\n{"id":"inv_002"}\n';
		const ids = parseStdinIds(input);
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	// ── Line-separated plain IDs ────────────────────────────────────
	test('parses line-separated plain IDs', () => {
		const ids = parseStdinIds('inv_001\ninv_002\ninv_003');
		expect(ids).toEqual(['inv_001', 'inv_002', 'inv_003']);
	});

	test('strips surrounding quotes from line-separated IDs', () => {
		const ids = parseStdinIds('"inv_001"\n"inv_002"');
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('strips single quotes from line-separated IDs', () => {
		const ids = parseStdinIds("'inv_001'\n'inv_002'");
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('skips comment lines starting with #', () => {
		const ids = parseStdinIds('# header\ninv_001\n# comment\ninv_002');
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('skips empty lines in line-separated input', () => {
		const ids = parseStdinIds('inv_001\n\n\ninv_002\n');
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('trims whitespace from each line', () => {
		const ids = parseStdinIds('  inv_001  \n  inv_002  ');
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	// ── Edge cases ──────────────────────────────────────────────────
	test('returns empty array for empty string', () => {
		expect(parseStdinIds('')).toEqual([]);
	});

	test('returns empty array for whitespace-only input', () => {
		expect(parseStdinIds('   \n  \n  ')).toEqual([]);
	});

	test('handles single ID without newline', () => {
		expect(parseStdinIds('inv_001')).toEqual(['inv_001']);
	});

	test('handles JSON number array by falling through to line parsing', () => {
		// Numbers are not strings, so JSON array parsing skips them.
		// The input is valid JSON parsed as array where first element is number,
		// so neither string-array nor object-array branch matches.
		// Falls through to line-separated parsing where "[1, 2, 3]" is one line.
		const ids = parseStdinIds('[1, 2, 3]');
		expect(ids).toHaveLength(1);
		expect(ids[0]).toBe('[1, 2, 3]');
	});

	test('handles deeply nested objects by not recursing', () => {
		const input = JSON.stringify({ data: { items: [{ id: 'nested' }] } });
		const ids = parseStdinIds(input);
		// Only checks first-level array properties, not nested
		expect(ids).toEqual([]);
	});

	test('handles malformed JSON gracefully by falling back to line parsing', () => {
		const ids = parseStdinIds('{bad json}\ninv_001\ninv_002');
		// First line starts with { so tries NDJSON, fails, falls through to plain text
		// But {bad json} starts with { which triggers NDJSON parsing that fails
		// Then falls to plain IDs, but {bad json} doesn't start with # so it's kept
		expect(ids).toContain('inv_001');
		expect(ids).toContain('inv_002');
	});

	test('handles Windows-style CRLF line endings', () => {
		const ids = parseStdinIds('inv_001\r\ninv_002\r\n');
		// \r gets trimmed by .trim()
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});
});
