import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../../helpers';

const mockCustomer = {
	id: 'cust_new_001',
	name: 'Acme Corp',
	email: 'acme@example.com',
	phone: '+60123456789',
	country: 'MY',
	createdAt: '2026-03-15',
};

let lastClientInstance: { post: ReturnType<typeof vi.fn> } | null = null;

// Mock the client module
vi.mock('../../../src/lib/client', () => {
	return {
		CyncoClient: class MockCyncoClient {},
		requireClient: (..._args: unknown[]) => {
			const inst = {
				get: vi.fn(),
				post: vi.fn().mockResolvedValue({
					data: mockCustomer,
					error: null,
					headers: null,
				}),
				patch: vi.fn(),
				delete: vi.fn(),
			};
			lastClientInstance = inst;
			return inst;
		},
		createClient: vi.fn(),
	};
});

describe('customers create command', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
		lastClientInstance = null;
	});

	afterEach(() => {
		restoreEnv();
	});

	test('creates customer with all flags in non-interactive mode', async () => {
		const spies = setupOutputSpies();

		const { createCustomerCmd } = await import('../../../src/commands/customers/create');
		await createCustomerCmd.parseAsync(
			[
				'--name',
				'Acme Corp',
				'--email',
				'acme@example.com',
				'--phone',
				'+60123456789',
				'--country',
				'MY',
			],
			{ from: 'user' },
		);

		// Verify client.post was called with correct body
		expect(lastClientInstance).not.toBeNull();
		expect(lastClientInstance?.post).toHaveBeenCalled();
		const callArgs = lastClientInstance?.post.mock.calls[0];
		expect(callArgs[0]).toBe('/customers');
		expect(callArgs[1]).toEqual({
			name: 'Acme Corp',
			email: 'acme@example.com',
			phone: '+60123456789',
			country: 'MY',
		});

		// Output should contain customer data
		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('cust_new_001');
	});

	test('creates customer with only required name flag', async () => {
		const _spies = setupOutputSpies();

		const { createCustomerCmd } = await import('../../../src/commands/customers/create');
		await createCustomerCmd.parseAsync(['--name', 'Simple Corp'], {
			from: 'user',
		});

		expect(lastClientInstance).not.toBeNull();
		const callArgs = lastClientInstance?.post.mock.calls[0];
		expect(callArgs[1]).toEqual({ name: 'Simple Corp' });
	});

	test('errors when missing required --name flag in non-interactive mode', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { createCustomerCmd } = await import('../../../src/commands/customers/create');

		await expect(createCustomerCmd.parseAsync([], { from: 'user' })).rejects.toThrow(ExitError);
	});

	test('errors with missing flags message mentioning --name', async () => {
		const spies = setupOutputSpies();
		mockExitThrow();

		const { createCustomerCmd } = await import('../../../src/commands/customers/create');

		try {
			await createCustomerCmd.parseAsync([], { from: 'user' });
		} catch {
			// Expected
		}

		const errorOutput = spies.error.mock.calls.map((c) => c[0]).join(' ');
		expect(errorOutput).toContain('--name');
	});
});
