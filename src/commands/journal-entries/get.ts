import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import { type JournalEntry, statusIndicator } from './utils';

export const getCmd = new Command('get')
	.description('Get a single journal entry by ID')
	.argument('<id>', 'Journal entry ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco journal-entries get jnl_abc123', 'cynco je get jnl_abc123 --json'],
		}),
	)
	.action(async (id) => {
		const globalOpts = getCmd.optsWithGlobals() as GlobalOpts;

		await runGet<JournalEntry>(
			{
				spinner: {
					loading: 'Fetching journal entry...',
					success: 'Journal entry loaded',
					fail: 'Failed to fetch journal entry',
				},
				apiCall: (client) => client.get('/journal-entries', { id }),
				onInteractive: (entry) => {
					console.log(`\n  Journal Entry: ${entry.entryNumber ?? entry.id}`);
					console.log(`  ID:          ${entry.id}`);
					console.log(`  Date:        ${entry.date ?? '-'}`);
					console.log(`  Status:      ${statusIndicator(entry.status)}`);
					console.log(`  Description: ${entry.description ?? '-'}`);
					console.log(`  Memo:        ${entry.memo ?? '-'}`);
					console.log(`  Total Debit: ${formatMoney(entry.totalDebit)}`);
					console.log(`  Total Credit:${formatMoney(entry.totalCredit)}`);

					if (entry.lines && entry.lines.length > 0) {
						console.log('\n  Lines:');
						for (const line of entry.lines) {
							const debit = line.debit != null ? `DR ${formatMoney(line.debit)}` : '';
							const credit = line.credit != null ? `CR ${formatMoney(line.credit)}` : '';
							console.log(
								`    ${line.accountName ?? line.accountId}  ${debit}${credit}  ${line.description ?? ''}`,
							);
						}
					}
					console.log('');
				},
			},
			globalOpts,
		);
	});
