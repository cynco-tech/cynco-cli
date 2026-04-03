import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import { buildHelpText } from '../lib/help-text';
import { clearHistory, readHistory } from '../lib/history';
import { outputResult } from '../lib/output';
import { isInteractive } from '../lib/tty';

export const historyCmd = new Command('history')
	.description('Show CLI command history')
	.option('--limit <n>', 'Number of entries to show', '20')
	.option('--clear', 'Clear command history')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco history',
				'cynco history --limit 50',
				'cynco history --json',
				'cynco history --clear',
			],
		}),
	)
	.action((opts) => {
		const globalOpts = historyCmd.optsWithGlobals() as GlobalOpts;

		if (opts.clear) {
			clearHistory();
			if (!globalOpts.json && isInteractive()) {
				process.stderr.write(`  ${pc.green('\u2714')} History cleared\n`);
			} else {
				outputResult({ cleared: true }, { json: globalOpts.json });
			}
			return;
		}

		const parsed = parseInt(opts.limit, 10);
		const limit = Number.isNaN(parsed) ? 20 : parsed;
		const entries = readHistory(limit);

		if (!globalOpts.json && isInteractive()) {
			if (entries.length === 0) {
				process.stderr.write(`  ${pc.dim('No history yet.')}\n`);
				return;
			}
			for (const entry of entries) {
				const time = entry.timestamp.replace('T', ' ').slice(0, 19);
				const status = entry.exitCode === 0 ? pc.green('\u2714') : pc.red('\u2717');
				const duration =
					entry.durationMs < 1000
						? `${Math.round(entry.durationMs)}ms`
						: `${(entry.durationMs / 1000).toFixed(1)}s`;
				process.stderr.write(
					`  ${pc.dim(time)}  ${status}  ${entry.command}  ${pc.dim(duration)}\n`,
				);
			}
		} else {
			outputResult(entries, { json: globalOpts.json });
		}
	});
