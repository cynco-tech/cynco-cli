import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

const mockReport = {
	type: 'trial_balance',
	period: '2026-03',
	rows: [
		{ accountCode: '1000', accountName: 'Cash', debit: 50000, credit: 0 },
		{ accountCode: '3000', accountName: 'Revenue', debit: 0, credit: 50000 },
	],
	summary: { totalDebit: 50000, totalCredit: 50000 },
};

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi.fn().mockResolvedValue({ data: mockReport, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('report shortcuts', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('tb shortcut calls trial_balance endpoint', async () => {
		setupOutputSpies();
		const { tbCmd } = await import('../../src/commands/report-shortcuts');
		await tbCmd.parseAsync(['--period', '2026-03'], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/reports/trial_balance', { period: '2026-03' });
	});

	test('bs shortcut calls balance_sheet endpoint', async () => {
		setupOutputSpies();
		const { bsCmd } = await import('../../src/commands/report-shortcuts');
		await bsCmd.parseAsync([], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/reports/balance_sheet', {});
	});

	test('pl shortcut calls income_statement endpoint', async () => {
		setupOutputSpies();
		const { plCmd } = await import('../../src/commands/report-shortcuts');
		await plCmd.parseAsync([], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/reports/income_statement', {});
	});

	test('ar shortcut calls aged_receivables endpoint', async () => {
		setupOutputSpies();
		const { arCmd } = await import('../../src/commands/report-shortcuts');
		await arCmd.parseAsync([], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/reports/aged_receivables', {});
	});

	test('ap shortcut calls aged_payables endpoint', async () => {
		setupOutputSpies();
		const { apCmd } = await import('../../src/commands/report-shortcuts');
		await apCmd.parseAsync([], { from: 'user' });
		expect(lastClient?.get).toHaveBeenCalledWith('/reports/aged_payables', {});
	});
});
