import { afterEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

describe('promptForMissing', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns current values when nothing is missing', async () => {
		setupOutputSpies();

		const { promptForMissing } = await import('../../src/lib/prompts');

		const current = { name: 'Acme Corp', email: 'acme@test.com' };
		const fields = [
			{ flag: 'name', message: 'Customer name' },
			{ flag: 'email', message: 'Email', required: false },
		];

		const result = await promptForMissing(current, fields, {});

		expect(result).toEqual(current);
	});

	test('returns current values when only optional fields are missing', async () => {
		setupOutputSpies();

		const { promptForMissing } = await import('../../src/lib/prompts');

		const current = { name: 'Acme Corp', email: undefined };
		const fields = [
			{ flag: 'name', message: 'Customer name' },
			{ flag: 'email', message: 'Email', required: false },
		];

		const result = await promptForMissing(current, fields, {});

		expect(result.name).toBe('Acme Corp');
	});

	test('errors in non-interactive mode when required fields missing', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { promptForMissing } = await import('../../src/lib/prompts');

		const current = { name: undefined, email: undefined };
		const fields = [
			{ flag: 'name', message: 'Customer name', required: true },
			{ flag: 'email', message: 'Email', required: false },
		];

		await expect(promptForMissing(current, fields, {})).rejects.toThrow(ExitError);
	});

	test('includes missing flag names in error message', async () => {
		const spies = setupOutputSpies();
		mockExitThrow();

		const { promptForMissing } = await import('../../src/lib/prompts');

		const current = { name: undefined, phone: undefined };
		const fields = [
			{ flag: 'name', message: 'Name' },
			{ flag: 'phone', message: 'Phone' },
		];

		try {
			await promptForMissing(current, fields, {});
		} catch {
			// Expected
		}

		const errorOutput = spies.error.mock.calls.map((c) => c[0]).join(' ');
		expect(errorOutput).toContain('--name');
		expect(errorOutput).toContain('--phone');
	});
});

describe('requireText', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns value when already provided', async () => {
		setupOutputSpies();

		const { requireText } = await import('../../src/lib/prompts');

		const result = await requireText(
			'existing-value',
			{ message: 'Enter value' },
			{ message: 'Value is required', code: 'missing_value' },
			{},
		);

		expect(result).toBe('existing-value');
	});

	test('errors in non-interactive mode when value is missing', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { requireText } = await import('../../src/lib/prompts');

		await expect(
			requireText(
				undefined,
				{ message: 'Enter value' },
				{ message: 'Value is required', code: 'missing_value' },
				{},
			),
		).rejects.toThrow(ExitError);
	});
});

describe('requireSelect', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns value when already provided', async () => {
		setupOutputSpies();

		const { requireSelect } = await import('../../src/lib/prompts');

		const result = await requireSelect(
			'option_a' as const,
			{
				message: 'Pick one',
				options: [
					{ value: 'option_a' as const, label: 'Option A' },
					{ value: 'option_b' as const, label: 'Option B' },
				],
			},
			{ message: 'Selection required', code: 'missing_selection' },
			{},
		);

		expect(result).toBe('option_a');
	});

	test('errors in non-interactive mode when no value given', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { requireSelect } = await import('../../src/lib/prompts');

		await expect(
			requireSelect(
				undefined,
				{
					message: 'Pick one',
					options: [{ value: 'a' as const, label: 'A' }],
				},
				{ message: 'Selection required', code: 'missing_selection' },
				{},
			),
		).rejects.toThrow(ExitError);
	});
});

describe('confirmDelete', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('errors in non-interactive mode without --yes', async () => {
		setupOutputSpies();
		mockExitThrow();

		const { confirmDelete } = await import('../../src/lib/prompts');

		await expect(confirmDelete('Delete this item?', {})).rejects.toThrow(ExitError);
	});
});
