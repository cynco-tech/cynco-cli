import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Account } from './utils';
import { accountTypeLabel } from './utils';

export const getCmd = new Command('get')
	.description('Get a single account by ID')
	.argument('<id>', 'Account ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco accounts get coa_abc123', 'cynco accounts get coa_abc123 --json'],
		}),
	)
	.action(async (id) => {
		const globalOpts = getCmd.optsWithGlobals() as GlobalOpts;

		await runGet<Account>(
			{
				spinner: {
					loading: 'Fetching account...',
					success: 'Account loaded',
					fail: 'Failed to fetch account',
				},
				apiCall: (client) => client.get('/accounts', { id }),
				onInteractive: (account) => {
					console.log(`\n  Account: ${account.name ?? account.id}`);
					console.log(`  ID:             ${account.id}`);
					console.log(`  Code:           ${account.code ?? '-'}`);
					console.log(`  Type:           ${accountTypeLabel(account.type)}`);
					console.log(`  Normal Balance: ${account.normalBalance ?? '-'}`);
					console.log(`  Active:         ${account.isActive === false ? 'No' : 'Yes'}`);
					console.log(`  Description:    ${account.description ?? '-'}`);
					if (account.parentId) {
						console.log(`  Parent ID:      ${account.parentId}`);
					}
					console.log('');
				},
			},
			globalOpts,
		);
	});
