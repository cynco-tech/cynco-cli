import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { readFile } from '../../lib/files';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';

interface BatchResult {
	total: number;
	succeeded: number;
	failed: number;
	results?: Array<{
		index: number;
		status: 'success' | 'error';
		id?: string;
		error?: string;
	}>;
}

export const batchCmd = new Command('batch')
	.description('Batch create journal entries from a JSON file')
	.requiredOption('-f, --file <path>', 'Path to JSON file with journal entries')
	.option('--dry-run', 'Validate without creating')
	.addHelpText(
		'after',
		buildHelpText({
			context:
				'The JSON file should contain an array of journal entry objects.\n' +
				'  Each entry must have: date, description, lines (array of {accountId, debit?, credit?, description?})',
			examples: [
				'cynco journal-entries batch --file ./entries.json',
				'cynco journal-entries batch --file ./month-end.json --dry-run',
				'cynco je batch -f ./adjustments.json',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const content = readFile(opts.file, globalOpts);
		let entries: unknown[];
		try {
			const parsed = JSON.parse(content) as unknown;
			if (!Array.isArray(parsed)) {
				outputError(
					{
						message: 'File must contain a JSON array of journal entries',
						code: 'invalid_format',
					},
					{ json: globalOpts.json },
				);
			}
			entries = parsed;
		} catch {
			outputError(
				{ message: `Invalid JSON in ${opts.file}`, code: 'invalid_json' },
				{ json: globalOpts.json },
			);
		}

		if (entries.length === 0) {
			outputError(
				{ message: 'File contains no entries', code: 'empty_batch' },
				{ json: globalOpts.json },
			);
			return;
		}

		const body: Record<string, unknown> = {
			operations: entries.map((entry) => ({ method: 'create', data: entry })),
		};
		if (opts.dryRun) body.dryRun = true;

		await runCreate<BatchResult>(
			{
				spinner: {
					loading: `${opts.dryRun ? 'Validating' : 'Creating'} ${entries.length} journal entries...`,
					success: `Batch ${opts.dryRun ? 'validation' : 'creation'} complete`,
					fail: 'Batch operation failed',
				},
				apiCall: (client) => client.post('/journal-entries/batch', body),
				onInteractive: (result) => {
					console.log('');
					console.log(`  ${pc.bold(opts.dryRun ? 'Dry Run Results' : 'Batch Results')}`);
					console.log(`  ${pc.dim('Total:')}      ${result.total}`);
					console.log(`  ${pc.dim('Succeeded:')}  ${pc.green(String(result.succeeded))}`);
					if (result.failed > 0) {
						console.log(`  ${pc.dim('Failed:')}     ${pc.red(String(result.failed))}`);
					}

					if (result.results) {
						const failures = result.results.filter((r) => r.status === 'error');
						if (failures.length > 0) {
							console.log('');
							console.log(`  ${pc.red('Failures:')}`);
							for (const f of failures.slice(0, 20)) {
								console.log(`    Entry ${f.index + 1}: ${f.error ?? 'Unknown error'}`);
							}
							if (failures.length > 20) {
								console.log(`    ... and ${failures.length - 20} more`);
							}
						}
					}
					console.log('');
				},
			},
			globalOpts,
		);
	});
