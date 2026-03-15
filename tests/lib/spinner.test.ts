import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	captureTestEnv,
	ExitError,
	mockExitThrow,
	setNonInteractive,
	setupOutputSpies,
} from '../helpers';

describe('createSpinner', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns no-op spinner in non-interactive mode', async () => {
		setNonInteractive();
		const { createSpinner } = await import('../../src/lib/spinner');
		const spinner = createSpinner('Loading...');

		// All methods should be no-ops (not throw, not write to stderr)
		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		spinner.update('new message');
		spinner.stop('done');
		spinner.warn('warning');
		spinner.fail('failed');

		// No-op spinner should not write to stderr
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	test('returns no-op spinner when quiet is true', async () => {
		// Even in interactive mode, quiet flag should return no-op
		Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
		Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

		const { createSpinner } = await import('../../src/lib/spinner');
		const spinner = createSpinner('Loading...', true);

		const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		spinner.update('test');
		spinner.stop('done');

		expect(stderrSpy).not.toHaveBeenCalled();
	});
});

describe('withSpinner', () => {
	const restoreEnv = captureTestEnv();

	beforeEach(() => {
		process.env.CYNCO_API_KEY = 'cak_test_key';
	});

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('returns data on successful API call', async () => {
		setNonInteractive();
		const { withSpinner } = await import('../../src/lib/spinner');

		const mockData = { id: 'inv_123', total: 500 };
		const call = vi.fn().mockResolvedValue({
			data: mockData,
			error: null,
			headers: null,
		});

		const result = await withSpinner(
			{ loading: 'Loading...', success: 'Done', fail: 'Failed' },
			call,
			'test_error',
			{},
		);

		expect(result).toEqual(mockData);
		expect(call).toHaveBeenCalledOnce();
	});

	test('calls outputError on API error', async () => {
		const spies = setupOutputSpies();
		mockExitThrow();

		const { withSpinner } = await import('../../src/lib/spinner');

		const call = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Not found', code: 'not_found' },
			headers: null,
		});

		await expect(
			withSpinner(
				{ loading: 'Loading...', success: 'Done', fail: 'Failed' },
				call,
				'test_error',
				{},
			),
		).rejects.toThrow(ExitError);

		expect(spies.error).toHaveBeenCalled();
	});

	test('calls outputError on null data', async () => {
		const spies = setupOutputSpies();
		mockExitThrow();

		const { withSpinner } = await import('../../src/lib/spinner');

		const call = vi.fn().mockResolvedValue({
			data: null,
			error: null,
			headers: null,
		});

		await expect(
			withSpinner(
				{ loading: 'Loading...', success: 'Done', fail: 'Failed' },
				call,
				'test_error',
				{},
			),
		).rejects.toThrow(ExitError);

		expect(spies.error).toHaveBeenCalled();
	});

	test('calls outputError when call throws an exception', async () => {
		const spies = setupOutputSpies();
		mockExitThrow();

		const { withSpinner } = await import('../../src/lib/spinner');

		const call = vi.fn().mockRejectedValue(new Error('Network failure'));

		await expect(
			withSpinner(
				{ loading: 'Loading...', success: 'Done', fail: 'Failed' },
				call,
				'test_error',
				{},
			),
		).rejects.toThrow(ExitError);

		expect(spies.error).toHaveBeenCalled();
	});

	test('retries on RATE_LIMITED error and succeeds', async () => {
		setNonInteractive();
		const { withSpinner } = await import('../../src/lib/spinner');

		const mockData = { id: 'inv_123' };
		const call = vi
			.fn()
			.mockResolvedValueOnce({
				data: null,
				error: { message: 'Rate limited', code: 'RATE_LIMITED' },
				headers: { 'retry-after': '0' },
			})
			.mockResolvedValueOnce({
				data: mockData,
				error: null,
				headers: null,
			});

		const result = await withSpinner(
			{ loading: 'Loading...', success: 'Done', fail: 'Failed' },
			call,
			'test_error',
			{},
		);

		expect(result).toEqual(mockData);
		expect(call).toHaveBeenCalledTimes(2);
	});
});
