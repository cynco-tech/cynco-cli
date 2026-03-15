import { Command } from '@commander-js/extra-typings';
import { runDelete } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const deleteCustomerCmd = new Command('delete')
	.alias('rm')
	.description('Delete a customer')
	.argument('<id>', 'Customer ID')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco customers delete cust_abc123', 'cynco customers delete cust_abc123 --yes'],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runDelete(
			id,
			opts.yes ?? false,
			{
				confirmMessage: `Delete customer ${id}? This cannot be undone.`,
				spinner: {
					loading: 'Deleting customer...',
					success: 'Customer deleted',
					fail: 'Failed to delete customer',
				},
				object: 'customer',
				successMsg: `Customer ${id} deleted.`,
				apiCall: (client) => client.delete(`/customers?id=${encodeURIComponent(id)}`),
			},
			globalOpts,
		);
	});
