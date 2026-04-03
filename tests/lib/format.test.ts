import { describe, expect, it } from 'vitest';
import { colorizeStatus, formatMoney, formatPercent, statusIndicator } from '../../src/lib/format';

describe('formatMoney', () => {
	it('formats a number with 2 decimal places', () => {
		expect(formatMoney(1234.5)).toMatch(/1.*234\.50/);
	});

	it('prepends currency code when provided', () => {
		const result = formatMoney(100, 'MYR');
		expect(result).toContain('MYR');
		expect(result).toContain('100.00');
	});

	it('returns dash for null', () => {
		expect(formatMoney(null)).toBe('-');
	});

	it('returns dash for undefined', () => {
		expect(formatMoney(undefined)).toBe('-');
	});

	it('handles zero', () => {
		expect(formatMoney(0)).toContain('0.00');
	});
});

describe('colorizeStatus', () => {
	it('applies green to paid', () => {
		const result = colorizeStatus('paid');
		expect(result).toContain('paid');
	});

	it('applies yellow to draft', () => {
		const result = colorizeStatus('draft');
		expect(result).toContain('draft');
	});

	it('returns status string for unknown statuses', () => {
		const result = colorizeStatus('custom_status');
		expect(result).toContain('custom_status');
	});

	it('accepts extra color mappings', () => {
		const result = colorizeStatus('special', { special: (s: string) => `[${s}]` });
		expect(result).toBe('[special]');
	});
});

describe('statusIndicator', () => {
	it('returns em-dash for undefined', () => {
		const result = statusIndicator(undefined);
		expect(result).toContain('\u2014'); // em-dash
	});

	it('returns colorized status for valid status', () => {
		const result = statusIndicator('paid');
		expect(result).toContain('paid');
	});
});

describe('formatPercent', () => {
	it('formats a percentage', () => {
		expect(formatPercent(10)).toBe('10%');
	});

	it('returns dash for undefined', () => {
		expect(formatPercent(undefined)).toBe('-');
	});
});
