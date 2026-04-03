import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockRenameProfile = vi.fn();

vi.mock('../../../src/lib/config', () => ({
	listProfiles: vi.fn().mockReturnValue([{ name: 'default', active: true }]),
	renameProfile: mockRenameProfile,
	validateProfileName: vi.fn().mockReturnValue(undefined),
	resolveApiKey: vi.fn(),
}));

describe('auth rename command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		mockRenameProfile.mockReset();
	});
	afterEach(restore);

	test('renames profile with both args', async () => {
		const spies = setupOutputSpies();
		const { rename } = await import('../../../src/commands/auth/rename');
		await rename.parseAsync(['default', 'production'], { from: 'user' });
		expect(mockRenameProfile).toHaveBeenCalledWith('default', 'production');
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.old_name).toBe('default');
		expect(parsed.new_name).toBe('production');
	});

	test('errors without args in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { rename } = await import('../../../src/commands/auth/rename');
		await expect(rename.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
