import { describe, expect, test } from 'vitest';
import { enrichErrorDetails, formatErrorHints } from '../../src/lib/error-hints';

describe('enrichErrorDetails', () => {
	test('maps known camelCase API field to CLI flag hint', () => {
		const details = [{ field: 'customerId', message: 'Required' }];
		const enriched = enrichErrorDetails(details);
		expect(enriched).toHaveLength(1);
		expect(enriched[0]).toEqual({
			field: 'customerId',
			message: 'Required',
			flag: '--customer-id <id>',
		});
	});

	test('preserves detail without hint when field is not in mapping', () => {
		const details = [{ field: 'obscureField', message: 'Invalid' }];
		const enriched = enrichErrorDetails(details);
		expect(enriched).toHaveLength(1);
		expect(enriched[0]).toEqual({ field: 'obscureField', message: 'Invalid' });
		expect(enriched[0]).not.toHaveProperty('flag');
	});

	test('handles multiple details with mixed known and unknown fields', () => {
		const details = [
			{ field: 'email', message: 'Required' },
			{ field: 'unknownField', message: 'Bad' },
			{ field: 'dueDate', message: 'Invalid format' },
		];
		const enriched = enrichErrorDetails(details);
		expect(enriched).toHaveLength(3);
		expect(enriched[0].flag).toBe('--email <address>');
		expect(enriched[1]).not.toHaveProperty('flag');
		expect(enriched[2].flag).toBe('--due-date <YYYY-MM-DD>');
	});

	test('returns empty array when given empty details array', () => {
		expect(enrichErrorDetails([])).toEqual([]);
	});

	test('maps all date-related fields to date format hints', () => {
		const dateFields = ['dueDate', 'issueDate', 'startDate', 'endDate', 'date', 'from', 'to'];
		for (const field of dateFields) {
			const enriched = enrichErrorDetails([{ field, message: 'test' }]);
			expect(enriched[0].flag).toContain('YYYY-MM-DD');
		}
	});

	test('maps amount-related fields to number format hints', () => {
		const numFields = ['amount', 'unitPrice', 'quantity', 'taxRate'];
		for (const field of numFields) {
			const enriched = enrichErrorDetails([{ field, message: 'test' }]);
			expect(enriched[0].flag).toContain('<number>');
		}
	});
});

describe('formatErrorHints', () => {
	test('formats known field with flag suggestion and em-dash separator', () => {
		const details = [{ field: 'customerId', message: 'Required' }];
		const lines = formatErrorHints(details);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain('customerId');
		expect(lines[0]).toContain('Required');
		expect(lines[0]).toContain('--customer-id <id>');
		expect(lines[0]).toContain('\u2014'); // em-dash
	});

	test('formats unknown field without flag suggestion', () => {
		const details = [{ field: 'weirdField', message: 'Bad value' }];
		const lines = formatErrorHints(details);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain('weirdField');
		expect(lines[0]).toContain('Bad value');
		expect(lines[0]).not.toContain('\u2014');
	});

	test('returns empty array for empty input', () => {
		expect(formatErrorHints([])).toEqual([]);
	});

	test('each line starts with indentation for consistent formatting', () => {
		const details = [
			{ field: 'name', message: 'Required' },
			{ field: 'email', message: 'Invalid' },
		];
		const lines = formatErrorHints(details);
		for (const line of lines) {
			expect(line.startsWith('  ')).toBe(true);
		}
	});
});
