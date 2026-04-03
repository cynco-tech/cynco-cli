import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

let lastClient: { delete: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn().mockResolvedValue({ data: { deleted: true }, error: null, headers: null }),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('api-keys delete command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('deletes api key with --yes', async () => {
		const spies = setupOutputSpies();
		const { deleteApiKeyCmd } = await import('../../../src/commands/api-keys/delete');
		await deleteApiKeyCmd.parseAsync(['api_001', '--yes'], { from: 'user' });
		expect(lastClient?.delete).toHaveBeenCalledWith('/api-keys/api_001');
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('api_001');
	});

	test('errors without --yes in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { deleteApiKeyCmd } = await import('../../../src/commands/api-keys/delete');
		await expect(deleteApiKeyCmd.parseAsync(['api_001'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
