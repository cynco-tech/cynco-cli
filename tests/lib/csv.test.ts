import { describe, expect, it } from 'vitest';
import { toCsv } from '../../src/lib/csv';

describe('toCsv', () => {
	it('generates CSV with headers and rows', () => {
		const result = toCsv(
			['Name', 'Email'],
			[
				['Alice', 'alice@example.com'],
				['Bob', 'bob@example.com'],
			],
		);
		expect(result).toBe('Name,Email\nAlice,alice@example.com\nBob,bob@example.com');
	});

	it('escapes fields containing commas', () => {
		const result = toCsv(['Name'], [['Doe, John']]);
		expect(result).toContain('"Doe, John"');
	});

	it('escapes fields containing double quotes', () => {
		const result = toCsv(['Name'], [['Say "Hello"']]);
		expect(result).toContain('"Say ""Hello"""');
	});

	it('escapes fields containing newlines', () => {
		const result = toCsv(['Note'], [['Line1\nLine2']]);
		expect(result).toContain('"Line1\nLine2"');
	});

	it('returns only headers when no rows', () => {
		const result = toCsv(['A', 'B'], []);
		expect(result).toBe('A,B');
	});

	it('handles empty strings', () => {
		const result = toCsv(['A'], [['']]);
		expect(result).toBe('A\n');
	});
});
