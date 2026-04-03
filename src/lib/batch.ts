import { readFileSync } from 'node:fs';
import pc from 'picocolors';
import type { CyncoClient, GlobalOpts } from './client';
import { requireClient } from './client';
import { readFile } from './files';
import { outputError, outputResult } from './output';
import { parseStdinIds } from './stdin-ids';
import { isInteractive } from './tty';

export interface BatchResult {
	total: number;
	succeeded: number;
	failed: number;
	results: Array<{ id: string; status: 'success' | 'error'; error?: string }>;
}

export type BatchAction = (
	client: CyncoClient,
	id: string,
) => Promise<{ error: { message: string } | null }>;

/**
 * Resolves IDs from positional args, --file, or --stdin.
 */
export function resolveIds(
	args: string[],
	opts: { file?: string; stdin?: boolean },
	globalOpts: GlobalOpts,
): string[] {
	if (opts.file) {
		const content = readFile(opts.file, globalOpts);
		return content
			.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0 && !l.startsWith('#'));
	}

	if (opts.stdin) {
		const content = readFileSync(0, 'utf-8');
		const ids = parseStdinIds(content);
		if (ids.length > 0) return ids;
		// Fallback to line-separated parsing
		return content
			.split('\n')
			.map((l) => l.trim().replace(/^"|"$/g, ''))
			.filter((l) => l.length > 0);
	}

	if (args.length === 0) {
		outputError(
			{
				message: 'No IDs provided. Use positional args, --file, or --stdin.',
				code: 'no_ids',
			},
			{ json: globalOpts.json },
		);
	}

	return args;
}

/**
 * Runs a batch operation with concurrency control and progress reporting.
 */
export async function runBatch(
	ids: string[],
	action: BatchAction,
	config: {
		actionLabel: string;
		itemLabel?: string;
		concurrency?: number;
	},
	globalOpts: GlobalOpts,
): Promise<void> {
	if (globalOpts.dryRun) {
		const preview = {
			dry_run: true,
			action: config.actionLabel,
			count: ids.length,
			ids,
		};
		if (!globalOpts.json && isInteractive()) {
			process.stderr.write(
				`${pc.yellow('DRY RUN')} \u2014 would ${config.actionLabel} ${ids.length} ${config.itemLabel ?? 'items'}:\n`,
			);
			for (const id of ids.slice(0, 10)) {
				process.stderr.write(`  ${id}\n`);
			}
			if (ids.length > 10) {
				process.stderr.write(`  ... and ${ids.length - 10} more\n`);
			}
		} else {
			outputResult(preview, { json: globalOpts.json });
		}
		return;
	}
	const client = requireClient(globalOpts);
	const concurrency = config.concurrency ?? 5;
	const showProgress = !globalOpts.quiet && isInteractive();

	const results: BatchResult['results'] = [];
	let succeeded = 0;
	let failed = 0;

	function renderProgress(): void {
		if (!showProgress) return;
		const done = succeeded + failed;
		const total = ids.length;
		const barWidth = 20;
		const filled = Math.round((done / total) * barWidth);
		const bar = `${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)}`;
		const failStr = failed > 0 ? pc.red(` (${failed} failed)`) : '';
		process.stderr.write(`\r\x1B[2K  ${config.actionLabel}  [${bar}] ${done}/${total}${failStr}`);
	}

	renderProgress();

	// Process in chunks of `concurrency`
	for (let i = 0; i < ids.length; i += concurrency) {
		const chunk = ids.slice(i, i + concurrency);
		const promises = chunk.map(async (id) => {
			try {
				const result = await action(client, id);
				if (result.error) {
					failed++;
					results.push({ id, status: 'error', error: result.error.message });
				} else {
					succeeded++;
					results.push({ id, status: 'success' });
				}
			} catch (err) {
				failed++;
				results.push({
					id,
					status: 'error',
					error: err instanceof Error ? err.message : 'Unknown error',
				});
			}
			renderProgress();
		});
		await Promise.all(promises);
	}

	const summary: BatchResult = {
		total: ids.length,
		succeeded,
		failed,
		results,
	};

	if (showProgress) {
		process.stderr.write(`\r\x1B[2K  ${pc.green('\u2714')} ${config.actionLabel} complete\n`);
	}

	if (!globalOpts.json && isInteractive()) {
		process.stderr.write('\n');
		process.stderr.write(`  ${pc.bold(`${config.actionLabel} Results`)}\n`);
		process.stderr.write(`  ${pc.dim('Total:')}      ${summary.total}\n`);
		process.stderr.write(`  ${pc.dim('Succeeded:')}  ${pc.green(String(summary.succeeded))}\n`);
		if (summary.failed > 0) {
			process.stderr.write(`  ${pc.dim('Failed:')}     ${pc.red(String(summary.failed))}\n`);
			process.stderr.write('\n');
			const failures = summary.results.filter((r) => r.status === 'error');
			for (const f of failures.slice(0, 10)) {
				process.stderr.write(`    ${pc.red(f.id)}: ${f.error}\n`);
			}
			if (failures.length > 10) {
				process.stderr.write(`    ... and ${failures.length - 10} more\n`);
			}
		}
		process.stderr.write('\n');
	} else {
		outputResult(summary, { json: globalOpts.json });
	}
}
