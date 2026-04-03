import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockSetActiveProfile = vi.fn();

vi.mock('../../../src/lib/config', () => ({
	listProfiles: vi.fn().mockReturnValue([
		{ name: 'default', active: true },
		{ name: 'staging', active: false },
	]),
	setActiveProfile: mockSetActiveProfile,
	validateProfileName: vi.fn().mockReturnValue(undefined),
	resolveApiKey: vi.fn(),
}));

vi.mock('../../../src/lib/prompts', () => ({
	cancelAndExit: vi.fn(),
	promptRenameIfInvalid: vi.fn().mockResolvedValue(null),
}));

describe('auth switch command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		mockSetActiveProfile.mockReset();
	});
	afterEach(restore);

	test('switches to named profile', async () => {
		const spies = setupOutputSpies();
		const { switchProfile } = await import('../../../src/commands/auth/switch');
		await switchProfile.parseAsync(['staging'], { from: 'user' });
		expect(mockSetActiveProfile).toHaveBeenCalledWith('staging');
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.active_profile).toBe('staging');
	});

	test('errors without name in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { switchProfile } = await import('../../../src/commands/auth/switch');
		await expect(switchProfile.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
