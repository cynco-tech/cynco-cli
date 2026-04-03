import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resolveIds } from '../../src/lib/batch';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

describe('resolveIds', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('returns positional args as IDs', () => {
		const ids = resolveIds(['inv_001', 'inv_002'], {}, { json: false });
		expect(ids).toEqual(['inv_001', 'inv_002']);
	});

	test('reads IDs from file', () => {
		const tmpFile = join(tmpdir(), `cynco-test-ids-${Date.now()}.txt`);
		writeFileSync(tmpFile, 'inv_001\ninv_002\n# comment\n\ninv_003\n');
		const ids = resolveIds([], { file: tmpFile }, { json: false });
		expect(ids).toEqual(['inv_001', 'inv_002', 'inv_003']);
	});

	test('errors with no IDs', () => {
		setupOutputSpies();
		mockExitThrow();
		expect(() => resolveIds([], {}, { json: false })).toThrow(ExitError);
	});
});
