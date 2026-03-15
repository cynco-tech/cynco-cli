import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import type { BankTransaction } from './utils';

export const getCmd = new Command('get')
	.description('Get a single bank transaction by ID')
	.argument('<id>', 'Transaction ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco bank-transactions get btx_abc123', 'cynco txns get btx_abc123 --json'],
		}),
	)
	.action(async (id) => {
		const globalOpts = getCmd.optsWithGlobals() as GlobalOpts;

		await runGet<BankTransaction>(
			{
				spinner: {
					loading: 'Fetching transaction...',
					success: 'Transaction loaded',
					fail: 'Failed to fetch transaction',
				},
				apiCall: (client) => client.get('/bank-transactions', { id }),
				onInteractive: (txn) => {
					console.log(`\n  Transaction: ${txn.id}`);
					console.log(`  Date:        ${txn.date ?? '-'}`);
					console.log(`  Description: ${txn.description ?? '-'}`);
					console.log(`  Amount:      ${formatMoney(txn.amount, txn.currency)}`);
					console.log(`  Type:        ${txn.type ?? '-'}`);
					console.log(`  Status:      ${txn.status ?? '-'}`);
					console.log(`  Account:     ${txn.accountName ?? '-'}`);
					console.log('');
				},
			},
			globalOpts,
		);
	});
