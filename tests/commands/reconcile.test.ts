import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

const mockStatus = {
	accountId: 'fac_001',
	accountName: 'Main Checking',
	currency: 'MYR',
	bookBalance: 50000,
	bankBalance: 50000,
	difference: 0,
	totalTransactions: 100,
	reconciledCount: 95,
	unreconciledCount: 5,
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockStatus, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('reconcile command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('shows reconciliation status', async () => {
		const spies = setupOutputSpies();
		const { reconcileCmd } = await import('../../src/commands/reconcile');
		await reconcileCmd.parseAsync(['--account-id', 'fac_001'], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('fac_001');
	});

	test('passes account-id and period params', async () => {
		setupOutputSpies();
		const { reconcileCmd } = await import('../../src/commands/reconcile');
		await reconcileCmd.parseAsync(['--account-id', 'fac_001', '--period', '2026-03'], {
			from: 'user',
		});
		const callArgs = lastClient?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('accountId', 'fac_001');
		expect(callArgs[1]).toHaveProperty('period', '2026-03');
	});

	test('errors without --account-id in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { reconcileCmd } = await import('../../src/commands/reconcile');
		await expect(reconcileCmd.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});
});
