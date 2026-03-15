import { describe, expect, test } from 'vitest';
import { renderTable } from '../../src/lib/table';

describe('renderTable', () => {
	test('renders empty message when no rows', () => {
		expect(renderTable(['A', 'B'], [])).toBe('(no results)');
	});

	test('renders custom empty message', () => {
		expect(renderTable(['A'], [], '(nothing here)')).toBe('(nothing here)');
	});

	test('renders a single-row table', () => {
		const result = renderTable(['Name', 'Age'], [['Alice', '30']]);
		expect(result).toContain('Name');
		expect(result).toContain('Age');
		expect(result).toContain('Alice');
		expect(result).toContain('30');
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

	test('pads columns to max width', () => {
		const result = renderTable(['Short', 'LongerHeader'], [['a', 'b']]);
		const lines = result.split('\n');
		// Header and data rows should have same length
		expect(lines[1]?.length).toBe(lines[3]?.length);
	});
});
