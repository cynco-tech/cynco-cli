import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import type { Customer } from './utils';

export const updateCustomerCmd = new Command('update')
	.description('Update a customer')
	.argument('<id>', 'Customer ID')
	.option('--name <name>', 'Customer name')
	.option('--email <email>', 'Customer email')
	.option('--phone <phone>', 'Phone number')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco customers update cust_abc123 --name "New Name"',
				'cynco customers update cust_abc123 --email new@example.com',
				'cynco customers update cust_abc123 --name "New Name" --phone "+60123456789"',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const body: Record<string, unknown> = { id };
		if (opts.name) body.name = opts.name;
		if (opts.email) body.email = opts.email;
		if (opts.phone) body.phone = opts.phone;

		if (!opts.name && !opts.email && !opts.phone) {
			outputError(
				{
					message: 'At least one field must be provided: --name, --email, or --phone',
					code: 'missing_fields',
				},
				{ json: globalOpts.json },
			);
		}

		await runWrite<Customer>(
			{
				spinner: {
					loading: 'Updating customer...',
					success: 'Customer updated',
					fail: 'Failed to update customer',
				},
				apiCall: (client) => client.patch('/customers', body),
				errorCode: 'update_error',
				successMsg: `Customer ${id} updated.`,
			},
			globalOpts,
		);
	});
