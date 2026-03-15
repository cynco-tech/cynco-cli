import { afterEach, describe, expect, test } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

describe('pagination', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
	});

	test('parseLimitOpt returns valid limit', async () => {
		setupOutputSpies();
		const { parseLimitOpt } = await import('../../src/lib/pagination');
		expect(parseLimitOpt('20', { json: true })).toBe(20);
		expect(parseLimitOpt('1', { json: true })).toBe(1);
		expect(parseLimitOpt('100', { json: true })).toBe(100);
	});

	test('parseLimitOpt rejects invalid limit', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { parseLimitOpt } = await import('../../src/lib/pagination');
		try {
			parseLimitOpt('0', { json: true });
		} catch (err) {
			expect(err).toBeInstanceOf(ExitError);
		}
		try {
			parseLimitOpt('101', { json: true });
		} catch (err) {
			expect(err).toBeInstanceOf(ExitError);
		}
	});

	test('buildPaginationParams builds correct params', async () => {
		const { buildPaginationParams } = await import('../../src/lib/pagination');
		expect(buildPaginationParams(1, 20)).toEqual({ page: '1', limit: '20' });
		expect(buildPaginationParams(2, 50, 'name', 'asc')).toEqual({
			page: '2',
			limit: '50',
			sort: 'name',
			order: 'asc',
		});
	});
});
