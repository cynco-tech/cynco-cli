import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

vi.mock('../../../src/lib/config', () => ({
	listProfiles: vi.fn().mockReturnValue([
		{ name: 'default', active: true },
		{ name: 'staging', active: false },
	]),
	readCredentials: vi.fn().mockReturnValue({
		profiles: {
			default: { api_key: 'cak_live_abc123def' },
			staging: { api_key: 'cak_test_xyz789' },
		},
	}),
	maskKey: vi.fn((key: string) => `${key.slice(0, 8)}...`),
	resolveApiKey: vi.fn(),
}));

describe('auth list command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('outputs profiles as JSON in non-interactive mode', async () => {
		const spies = setupOutputSpies();
		const { list } = await import('../../../src/commands/auth/list');
		list.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed).toHaveLength(2);
		expect(parsed[0].name).toBe('default');
		expect(parsed[0].active).toBe(true);
	});
});
