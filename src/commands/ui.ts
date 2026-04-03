import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../lib/client';
import { resolveApiKey } from '../lib/config';
import { buildHelpText } from '../lib/help-text';
import { outputError } from '../lib/output';

export const uiCmd = new Command('ui')
	.description('Launch interactive TUI dashboard')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco ui', 'cynco ui --profile staging', 'CYNCO_API_KEY=cak_xxx cynco ui'],
		}),
	)
	.action((_opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		// Check for bun
		try {
			execSync('bun --version', { stdio: 'ignore' });
		} catch {
			outputError(
				{
					message:
						'Bun is required for the TUI dashboard. Install it: curl -fsSL https://bun.sh/install | bash',
					code: 'missing_dependency',
				},
				{ json: globalOpts.json },
			);
		}

		// Resolve API key
		const resolved = resolveApiKey(globalOpts.apiKey, globalOpts.profile);
		if (!resolved) {
			outputError(
				{
					message: 'No API key found. Run `cynco login` first, or set CYNCO_API_KEY.',
					code: 'auth_error',
				},
				{ json: globalOpts.json },
			);
		}

		// Find TUI entry point — check dist/ first (built), then src/ (dev)
		const cliDir = resolve(import.meta.dirname ?? __dirname, '..', '..');
		const tuiDir = resolve(cliDir, '..', 'tui');
		const distEntry = resolve(tuiDir, 'dist', 'index.js');
		const srcEntry = resolve(tuiDir, 'src', 'index.tsx');

		let entryPoint = '';
		let args: string[] = [];

		if (existsSync(distEntry)) {
			entryPoint = 'bun';
			args = ['run', distEntry];
		} else if (existsSync(srcEntry)) {
			entryPoint = 'bun';
			args = ['run', srcEntry];
		} else {
			outputError(
				{
					message: `TUI not found. Expected at ${tuiDir}. Run: cd tui && bun install`,
					code: 'tui_not_found',
				},
				{ json: globalOpts.json },
			);
		}

		// Spawn TUI with the resolved API key in env
		const env: Record<string, string> = {
			...(process.env as Record<string, string>),
			CYNCO_API_KEY: resolved?.key ?? '',
		};

		// Pass profile if explicitly set
		if (globalOpts.profile) {
			env.CYNCO_PROFILE = globalOpts.profile;
		}

		try {
			execFileSync(entryPoint, args, {
				stdio: 'inherit',
				env,
			});
		} catch (err: unknown) {
			// execFileSync throws on non-zero exit. Exit code 0 means clean quit.
			const status =
				err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
			if (status !== 0) {
				process.exitCode = status;
			}
		}
	});
