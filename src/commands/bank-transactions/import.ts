import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../../lib/client';
import { requireClient } from '../../lib/client';
import { readFileAsFormData } from '../../lib/files';
import { buildHelpText } from '../../lib/help-text';
import { errorMessage, outputError, outputResult } from '../../lib/output';
import { requireText } from '../../lib/prompts';
import { createSpinner } from '../../lib/spinner';
import { isInteractive } from '../../lib/tty';

const SUPPORTED_FORMATS = ['.csv', '.ofx', '.qif', '.qfx'];

interface ImportResult {
	imported: number;
	skipped: number;
	duplicates: number;
	dateRange?: { from: string; to: string };
	errors?: Array<{ line: number; message: string }>;
}

export const importCmd = new Command('import')
	.description('Import bank transactions from a file')
	.argument('<file>', 'Path to the file (CSV, OFX, QIF)')
	.option('--account-id <id>', 'Target bank account ID')
	.option('--format <fmt>', 'File format: csv, ofx, qif, auto (default: auto)', 'auto')
	.option('--dry-run', 'Validate without importing')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bank-transactions import ./statement.csv --account-id fac_abc123',
				'cynco bank-transactions import ./may-2026.ofx --account-id fac_abc123',
				'cynco bank-transactions import ./transactions.csv --account-id fac_abc123 --dry-run',
			],
		}),
	)
	.action(async (filePath, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const accountId = await requireText(
			opts.accountId,
			{ message: 'Bank account ID', placeholder: 'fac_abc123' },
			{ message: '--account-id is required', code: 'missing_account_id' },
			globalOpts,
		);

		const { formData, ext } = readFileAsFormData(filePath, SUPPORTED_FORMATS, globalOpts);
		const format = opts.format === 'auto' ? ext.slice(1) : opts.format;

		formData.set('accountId', accountId);
		formData.set('format', format);
		if (opts.dryRun) formData.set('dryRun', 'true');

		const client = requireClient(globalOpts);
		const actionLabel = opts.dryRun ? 'Validating' : 'Importing';
		const spinner = createSpinner(`${actionLabel} transactions...`, globalOpts.quiet);

		try {
			const result = await client.upload<ImportResult>('/bank-transactions/import', formData);

			if (result.error) {
				spinner.fail('Import failed');
				outputError(
					{ message: result.error.message, code: 'import_error' },
					{ json: globalOpts.json },
				);
			}

			if (!result.data) {
				spinner.fail('Import failed');
				outputError({ message: 'Empty response', code: 'import_error' }, { json: globalOpts.json });
			}

			const data = result.data;
			spinner.stop(opts.dryRun ? 'Validation complete' : 'Import complete');

			if (!globalOpts.json && isInteractive()) {
				console.log('');
				console.log(`  ${pc.bold(opts.dryRun ? 'Dry Run Results' : 'Import Results')}`);
				console.log(`  ${pc.dim('Imported:')}    ${pc.green(String(data.imported))}`);
				if (data.skipped > 0)
					console.log(`  ${pc.dim('Skipped:')}     ${pc.yellow(String(data.skipped))}`);
				if (data.duplicates > 0)
					console.log(`  ${pc.dim('Duplicates:')}  ${pc.yellow(String(data.duplicates))}`);
				if (data.dateRange) {
					console.log(`  ${pc.dim('Date range:')}  ${data.dateRange.from} to ${data.dateRange.to}`);
				}
				if (data.errors && data.errors.length > 0) {
					console.log('');
					console.log(`  ${pc.red(`${data.errors.length} errors:`)}`);
					for (const err of data.errors.slice(0, 10)) {
						console.log(`    Line ${err.line}: ${err.message}`);
					}
					if (data.errors.length > 10) {
						console.log(`    ... and ${data.errors.length - 10} more`);
					}
				}
				console.log('');
			} else {
				outputResult(data, { json: globalOpts.json });
			}
		} catch (err) {
			spinner.fail('Import failed');
			outputError(
				{ message: errorMessage(err, 'Unknown error'), code: 'import_error' },
				{ json: globalOpts.json },
			);
		}
	});
