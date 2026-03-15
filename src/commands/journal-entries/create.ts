import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { promptForMissing } from '../../lib/prompts';
import type { JournalEntry, JournalEntryLine } from './utils';
import { statusIndicator } from './utils';

function parseLines(raw: string, globalOpts: GlobalOpts): JournalEntryLine[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		outputError(
			{
				message: '--lines must be valid JSON',
				code: 'invalid_lines',
			},
			{ json: globalOpts.json },
		);
	}

	if (!Array.isArray(parsed)) {
		outputError(
			{
				message: '--lines must be a JSON array of line objects',
				code: 'invalid_lines',
			},
			{ json: globalOpts.json },
		);
	}

	for (let i = 0; i < parsed.length; i++) {
		const line = parsed[i] as Record<string, unknown>;
		if (!line || typeof line !== 'object') {
			outputError(
				{
					message: `Line ${i} must be an object with accountId and either debit or credit`,
					code: 'invalid_lines',
				},
				{ json: globalOpts.json },
			);
		}
		if (typeof line.accountId !== 'string' || line.accountId.length === 0) {
			outputError(
				{
					message: `Line ${i} is missing a valid "accountId" (string)`,
					code: 'invalid_lines',
				},
				{ json: globalOpts.json },
			);
		}
		const hasDebit = typeof line.debit === 'number' && line.debit > 0;
		const hasCredit = typeof line.credit === 'number' && line.credit > 0;
		if (!hasDebit && !hasCredit) {
			outputError(
				{
					message: `Line ${i} must have a positive "debit" or "credit" amount`,
					code: 'invalid_lines',
				},
				{ json: globalOpts.json },
			);
		}
	}

	return parsed as JournalEntryLine[];
}

export const createCmd = new Command('create')
	.description('Create a new journal entry')
	.option('--date <date>', 'Entry date (YYYY-MM-DD)')
	.option('--description <text>', 'Entry description')
	.option('--memo <text>', 'Optional memo')
	.option(
		'--lines <json>',
		'JSON array of lines: [{"accountId":"...","debit":100},{"accountId":"...","credit":100}]',
	)
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco journal-entries create --date 2026-03-15 --description "Office supplies" --lines \'[{"accountId":"coa_exp1","debit":500},{"accountId":"coa_cash","credit":500}]\'',
				'cynco je create',
				'cynco journal-entries create --json',
			],
		}),
	)
	.action(async (opts) => {
		const globalOpts = createCmd.optsWithGlobals() as GlobalOpts;

		const fields = await promptForMissing(
			{ date: opts.date, description: opts.description },
			[
				{
					flag: 'date',
					message: 'Entry date (YYYY-MM-DD)',
					placeholder: '2026-03-15',
					validate: (v) =>
						v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? undefined : 'Date must be in YYYY-MM-DD format',
				},
				{
					flag: 'description',
					message: 'Description',
					placeholder: 'Office supplies purchase',
				},
			],
			globalOpts,
		);

		if (!opts.lines) {
			outputError(
				{
					message: 'Missing --lines flag. Provide a JSON array of debit/credit lines.',
					code: 'missing_lines',
				},
				{ json: globalOpts.json },
			);
		}

		const lines = parseLines(opts.lines, globalOpts);

		const body: Record<string, unknown> = {
			date: fields.date,
			description: fields.description,
			lines,
		};
		if (opts.memo) {
			body.memo = opts.memo;
		}

		await runCreate<JournalEntry>(
			{
				spinner: {
					loading: 'Creating journal entry...',
					success: 'Journal entry created',
					fail: 'Failed to create journal entry',
				},
				apiCall: (client) => client.post('/journal-entries', body),
				onInteractive: (entry) => {
					console.log(`\n  Created: ${entry.entryNumber ?? entry.id}`);
					console.log(`  ID:          ${entry.id}`);
					console.log(`  Date:        ${entry.date ?? '-'}`);
					console.log(`  Status:      ${statusIndicator(entry.status)}`);
					console.log(`  Description: ${entry.description ?? '-'}`);
					console.log('');
				},
			},
			globalOpts,
		);
	});
