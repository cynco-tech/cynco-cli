import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockRemoveApiKey = vi.fn();

vi.mock('../../../src/lib/config', () => ({
	removeApiKey: mockRemoveApiKey,
	resolveApiKey: vi.fn(),
}));

describe('auth remove command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		mockRemoveApiKey.mockReset();
	});
	afterEach(restore);

	test('removes profile with --yes', async () => {
		const spies = setupOutputSpies();
		const { remove } = await import('../../../src/commands/auth/remove');
		await remove.parseAsync(['staging', '--yes'], { from: 'user' });
		expect(mockRemoveApiKey).toHaveBeenCalledWith('staging');
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.profile).toBe('staging');
		expect(parsed.status).toBe('removed');
	});

	test('errors without --yes in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { remove } = await import('../../../src/commands/auth/remove');
		await expect(remove.parseAsync(['staging'], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
