import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../../helpers';

const mockCustomers = [
	{
		id: 'cust_001',
		name: 'Acme Corp',
		email: 'acme@example.com',
		phone: '+60123456789',
		country: 'MY',
		createdAt: '2026-03-01',
	},
	{
		id: 'cust_002',
		name: 'Beta Inc',
		email: 'beta@example.com',
		phone: null,
		country: 'US',
		createdAt: '2026-03-05',
	},
];

const mockPagination = {
	page: 1,
	limit: 20,
	total: 2,
	totalPages: 1,
	hasMore: false,
};

let lastClientInstance: { get: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn().mockResolvedValue({
					data: { customers: mockCustomers, pagination: mockPagination },
					error: null,
					headers: null,
					pagination: mockPagination,
				}),
				post: vi.fn(),
				patch: vi.fn(),
				delete: vi.fn(),
			};
			lastClientInstance = inst;
			return inst;
		},
		createClient: vi.fn(),
	};
});

describe('customers list command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
	});

	test('lists customers', async () => {
		const spies = setupOutputSpies();

		const { listCustomersCmd } = await import('../../../src/commands/customers/list');
		await listCustomersCmd.parseAsync([], { from: 'user' });

		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('cust_001');
		expect(output).toContain('cust_002');
	});

	test('JSON output includes customer data', async () => {
		const spies = setupOutputSpies();

		const { listCustomersCmd } = await import('../../../src/commands/customers/list');
		await listCustomersCmd.parseAsync([], { from: 'user' });

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('Acme Corp');
		expect(output).toContain('Beta Inc');
		expect(output).toContain('acme@example.com');
	});

	test('passes pagination params to client', async () => {
		const _spies = setupOutputSpies();

		const { listCustomersCmd } = await import('../../../src/commands/customers/list');
		await listCustomersCmd.parseAsync(['--limit', '50', '--page', '2'], {
			from: 'user',
		});

		expect(lastClientInstance).not.toBeNull();
		expect(lastClientInstance?.get).toHaveBeenCalled();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[0]).toBe('/customers');
		expect(callArgs[1]).toHaveProperty('limit', '50');
		expect(callArgs[1]).toHaveProperty('page', '2');
	});

	test('passes sort params to client', async () => {
		const _spies = setupOutputSpies();

		const { listCustomersCmd } = await import('../../../src/commands/customers/list');
		await listCustomersCmd.parseAsync(['--sort', 'name', '--order', 'asc'], {
			from: 'user',
		});

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.get.mock.calls[0];
		expect(callArgs[1]).toHaveProperty('sort', 'name');
		expect(callArgs[1]).toHaveProperty('order', 'asc');
	});
});
