import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

describe('extract command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('errors on unsupported file type', async () => {
		setupOutputSpies();
		mockExitThrow();

		vi.mock('../../src/lib/client', () => ({
			CyncoClient: class {},
			requireClient: () => ({
				get: vi.fn(),
				post: vi.fn(),
				patch: vi.fn(),
				delete: vi.fn(),
				upload: vi.fn(),
			}),
			createClient: vi.fn(),
		}));

		const { extractCmd } = await import('../../src/commands/extract');
		await expect(extractCmd.parseAsync(['./test.txt'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});

	test('errors on invalid document type', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { extractCmd } = await import('../../src/commands/extract');
		await expect(
			extractCmd.parseAsync(['./test.pdf', '--type', 'invalid'], { from: 'user' }),
		).rejects.toThrow(ExitError);
	});
});
