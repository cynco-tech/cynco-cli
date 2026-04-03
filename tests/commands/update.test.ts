import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

vi.mock('../../src/lib/update-check', () => ({
	fetchLatestVersion: vi.fn().mockResolvedValue('1.0.0'),
	isNewer: vi.fn().mockReturnValue(true),
	detectInstallMethod: vi.fn().mockReturnValue('npm install -g cynco-cli'),
}));

vi.mock('../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: vi.fn(),
	createClient: vi.fn(),
}));

describe('update command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
	});
	afterEach(restore);

	test('outputs update info as JSON', async () => {
		const spies = setupOutputSpies();
		const { update } = await import('../../src/commands/update');
		await update.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed.currentVersion).toBeDefined();
		expect(parsed.latestVersion).toBe('1.0.0');
		expect(parsed.updateAvailable).toBe(true);
	});
});
