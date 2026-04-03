import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { captureTestEnv, ExitError, mockExitThrow, setupOutputSpies } from '../helpers';

describe('completion command', () => {
	const restore = captureTestEnv();
	beforeEach(() => {});
	afterEach(restore);

	test('outputs bash completions', async () => {
		const spies = setupOutputSpies();
		const { completionCmd } = await import('../../src/commands/completion');
		await completionCmd.parseAsync(['bash'], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('_cynco_completions');
		expect(output).toContain('complete -F');
	});

	test('outputs zsh completions', async () => {
		const spies = setupOutputSpies();
		const { completionCmd } = await import('../../src/commands/completion');
		await completionCmd.parseAsync(['zsh'], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('#compdef cynco');
	});

	test('outputs fish completions', async () => {
		const spies = setupOutputSpies();
		const { completionCmd } = await import('../../src/commands/completion');
		await completionCmd.parseAsync(['fish'], { from: 'user' });
		const output = spies.log.mock.calls.map((c) => c[0]).join('\n');
		expect(output).toContain('complete -c cynco');
	});

	test('errors on invalid shell', async () => {
		setupOutputSpies();
		mockExitThrow();
		const { completionCmd } = await import('../../src/commands/completion');
		await expect(completionCmd.parseAsync(['powershell'], { from: 'user' })).rejects.toThrow(
			ExitError,
		);
	});
});
