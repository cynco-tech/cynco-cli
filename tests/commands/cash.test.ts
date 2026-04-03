import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

const mockAccounts = [
	{
		id: 'fac_001',
		name: 'Main Checking',
		currency: 'MYR',
		balance: 50000,
		accountType: 'checking',
	},
	{ id: 'fac_002', name: 'Savings', currency: 'MYR', balance: 120000, accountType: 'savings' },
];

let lastClient: { get: ReturnType<typeof vi.fn> } | null = null;

vi.mock('../../src/lib/client', () => ({
	CyncoClient: class {},
	requireClient: () => {
		const inst = {
			get: vi
				.fn()
				.mockResolvedValue({ data: { bankAccounts: mockAccounts }, error: null, headers: null }),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		};
		lastClient = inst;
		return inst;
	},
	createClient: vi.fn(),
}));

describe('cash command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test';
		lastClient = null;
	});
	afterEach(restore);

	test('shows cash position', async () => {
		const spies = setupOutputSpies();
		const { cashCmd } = await import('../../src/commands/cash');
		await cashCmd.parseAsync([], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('fac_001');
		expect(output).toContain('Main Checking');
	});

	test('passes currency filter', async () => {
		setupOutputSpies();
		const { cashCmd } = await import('../../src/commands/cash');
		await cashCmd.parseAsync(['--currency', 'USD'], { from: 'user' });
		expect(lastClient?.get.mock.calls[0][1]).toHaveProperty('currency', 'USD');
	});
});
