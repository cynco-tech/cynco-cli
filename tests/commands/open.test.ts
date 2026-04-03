import { afterEach, describe, expect, test, vi } from 'vitest';
import { captureTestEnv, setupOutputSpies } from '../helpers';

// Mock browser open so it doesn't actually open anything
vi.mock('../../src/lib/browser', () => ({
	openBrowser: vi.fn().mockResolvedValue(true),
}));

describe('open command', () => {
	const restoreEnv = captureTestEnv();

	afterEach(() => {
		restoreEnv();
		vi.restoreAllMocks();
	});

	test('opens default dashboard URL with no arguments', async () => {
		const spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync([], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/');
		expect(spies.log).toHaveBeenCalled();
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('https://app.cynco.io/');
	});

	test('opens invoices page', async () => {
		const _spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync(['invoices'], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/invoices');
	});

	test('opens settings page', async () => {
		const _spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync(['settings'], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/settings');
	});

	test('opens api-keys page', async () => {
		const _spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync(['api-keys'], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/settings/api-keys');
	});

	test('opens customers page', async () => {
		const _spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync(['customers'], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/customers');
	});

	test('handles unknown page as custom path', async () => {
		const _spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync(['nonexistent'], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/nonexistent');
	});

	test('JSON output has url and opened fields', async () => {
		const spies = setupOutputSpies();

		const { open } = await import('../../src/commands/open');
		await open.parseAsync([], { from: 'user' });

		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		const parsed = JSON.parse(output);
		expect(parsed).toHaveProperty('url');
		expect(parsed).toHaveProperty('opened', true);
		expect(parsed.url).toBe('https://app.cynco.io/');
	});

	test('accepts custom path with leading slash', async () => {
		const _spies = setupOutputSpies();
		const { openBrowser } = await import('../../src/lib/browser');

		const { open } = await import('../../src/commands/open');
		await open.parseAsync(['/dashboard/banking/fac_abc123'], { from: 'user' });

		expect(openBrowser).toHaveBeenCalledWith('https://app.cynco.io/dashboard/banking/fac_abc123');
	});
});
