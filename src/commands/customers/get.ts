import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Customer } from './utils';

export const getCustomerCmd = new Command('get')
	.description('Get a customer by ID')
	.argument('<id>', 'Customer ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco customers get cust_abc123', 'cynco customers get cust_abc123 --json'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runGet<Customer>(
			{
				spinner: {
					loading: 'Fetching customer...',
					success: 'Customer loaded',
					fail: 'Failed to fetch customer',
				},
				apiCall: (client) => client.get('/customers', { id }),
				onInteractive: (customer) => {
					console.log();
					console.log(`  Name:     ${customer.name ?? '-'}`);
					console.log(`  ID:       ${customer.id}`);
					console.log(`  Email:    ${customer.email ?? '-'}`);
					console.log(`  Phone:    ${customer.phone ?? '-'}`);
					console.log(`  Country:  ${customer.country ?? '-'}`);
					console.log(`  Created:  ${customer.createdAt ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
