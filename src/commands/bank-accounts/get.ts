import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { type BankAccount, formatBalance } from './utils';

function maskAccountNumber(accountNumber: string): string {
	if (accountNumber.length <= 4) {
		return `***${accountNumber}`;
	}
	return `***${accountNumber.slice(-4)}`;
}

export const getCmd = new Command('get')
	.description('Get a single bank account by ID')
	.argument('<id>', 'Bank account ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco bank-accounts get fac_abc123', 'cynco bank-accounts get fac_abc123 --json'],
		}),
	)
	.action(async (id) => {
		const globalOpts = getCmd.optsWithGlobals() as GlobalOpts;

		await runGet<BankAccount>(
			{
				spinner: {
					loading: 'Fetching bank account...',
					success: 'Bank account loaded',
					fail: 'Failed to fetch bank account',
				},
				apiCall: (client) => client.get('/bank-accounts', { id }),
				onInteractive: (account) => {
					console.log(`\n  Bank Account: ${account.name ?? account.id}`);
					console.log(`  ID:          ${account.id}`);
					console.log(`  Type:        ${account.accountType ?? '-'}`);
					console.log(`  Currency:    ${account.currency ?? '-'}`);
					console.log(`  Balance:     ${formatBalance(account.balance, account.currency)}`);
					console.log(`  Institution: ${account.institutionName ?? '-'}`);
					if (account.accountNumber) {
						console.log(`  Account #:   ${maskAccountNumber(account.accountNumber)}`);
					}
					console.log('');
				},
			},
			globalOpts,
		);
	});
