import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockRemoveApiKey = vi.fn().mockReturnValue('/fake/.cynco/credentials.json');
const mockListProfiles = vi.fn().mockReturnValue([]);

vi.mock('../../../src/lib/config', () => ({
	listProfiles: mockListProfiles,
	removeApiKey: mockRemoveApiKey,
	removeAllApiKeys: vi.fn().mockReturnValue('/fake/.cynco/credentials.json'),
	resolveApiKey: vi.fn(),
}));

describe('auth logout command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('removes specific profile with --profile', async () => {
		const spies = setupOutputSpies();
		const { logout } = await import('../../../src/commands/auth/logout');
		await logout.parseAsync(['--profile', 'staging'], { from: 'user' });
		expect(mockRemoveApiKey).toHaveBeenCalledWith('staging');
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.profile).toBe('staging');
		expect(parsed.status).toBe('removed');
	});

	test('outputs already_logged_out when no profiles', async () => {
		const spies = setupOutputSpies();
		mockListProfiles.mockReturnValue([]);
		const { logout } = await import('../../../src/commands/auth/logout');
		await logout.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.status).toBe('already_logged_out');
	});
});
