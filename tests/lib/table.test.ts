import { describe, expect, test } from 'vitest';
import { renderDetail, renderTable } from '../../src/lib/table';

describe('renderTable', () => {
	test('renders dimmed empty message when no rows', () => {
		const result = renderTable(['A', 'B'], []);
		expect(result).toContain('no results');
	});

	test('renders custom empty message with suggestion', () => {
		const result = renderTable(['A'], [], {
			message: 'No items found.',
			suggestion: 'Create one with: cynco items create',
		});
		expect(result).toContain('No items found.');
		expect(result).toContain('Create one with');
	});

	test('renders custom string empty message', () => {
		const result = renderTable(['A'], [], 'nothing here');
		expect(result).toContain('nothing here');
	});

	test('renders borderless table with headers and data', () => {
		const result = renderTable(['Name', 'Age'], [['Alice', '30']]);
		expect(result).toContain('Name');
		expect(result).toContain('Age');
		expect(result).toContain('Alice');
		expect(result).toContain('30');
		// No box-drawing characters
		expect(result).not.toContain('┌');
		expect(result).not.toContain('│');
		expect(result).not.toContain('└');
		expect(result).not.toContain('─');
	});

	test('renders multi-row table', () => {
		const result = renderTable(
			['ID', 'Status'],
			[
				['inv_001', 'paid'],
				['inv_002', 'draft'],
			],
		);
		expect(result).toContain('inv_001');
		expect(result).toContain('inv_002');
		expect(result).toContain('paid');
		expect(result).toContain('draft');
	});

	test('every line starts with 2-space indent', () => {
		const result = renderTable(['Name'], [['Alice'], ['Bob']]);
		const lines = result.split('\n').filter((l) => l.length > 0);
		for (const line of lines) {
			expect(line.startsWith('  ')).toBe(true);
		}
	});

	test('header row and data rows are separated by empty line', () => {
		const result = renderTable(['Name'], [['Alice']]);
		const lines = result.split('\n');
		// Line 0: header, Line 1: empty, Line 2: data
		expect(lines[1]).toBe('');
	});
});

describe('renderDetail', () => {
	test('renders title as bold with key-value pairs', () => {
		const result = renderDetail('Invoice INV-042', [
			['Customer', 'Acme Corp'],
			['Status', 'paid'],
		]);
		expect(result).toContain('Invoice INV-042');
		expect(result).toContain('Customer');
		expect(result).toContain('Acme Corp');
		expect(result).toContain('Status');
		expect(result).toContain('paid');
	});

	test('renders em-dash for null values', () => {
		const result = renderDetail('Test', [['Phone', null]]);
		expect(result).toContain('\u2014'); // em-dash
	});

	test('renders em-dash for empty string values', () => {
		const result = renderDetail('Test', [['Phone', '']]);
		expect(result).toContain('\u2014');
	});

	test('every line starts with 2-space indent', () => {
		const result = renderDetail('Title', [['Key', 'Value']]);
		const lines = result.split('\n').filter((l) => l.length > 0);
		for (const line of lines) {
			expect(line.startsWith('  ')).toBe(true);
		}
	});
});
