import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { promptForMissing } from '../../lib/prompts';
import type { Customer } from './utils';

export const createCustomerCmd = new Command('create')
	.description('Create a new customer')
	.option('--name <name>', 'Customer name')
	.option('--email <email>', 'Customer email')
	.option('--phone <phone>', 'Phone number')
	.option('--country <code>', 'Country code (e.g. MY, US, SG)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco customers create',
				'cynco customers create --name "Acme Corp"',
				'cynco customers create --name "Acme Corp" --email acme@example.com --country MY',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const values = await promptForMissing(
			{
				name: opts.name,
				email: opts.email,
				phone: opts.phone,
				country: opts.country,
			},
			[
				{ flag: 'name', message: 'Customer name', placeholder: 'Acme Corp' },
				{
					flag: 'email',
					message: 'Email address',
					placeholder: 'hello@example.com',
					required: false,
				},
				{
					flag: 'phone',
					message: 'Phone number',
					placeholder: '+60123456789',
					required: false,
				},
				{
					flag: 'country',
					message: 'Country code',
					placeholder: 'MY',
					required: false,
				},
			],
			globalOpts,
		);

		const body: Record<string, unknown> = { name: values.name };
		if (values.email) body.email = values.email;
		if (values.phone) body.phone = values.phone;
		if (values.country) body.country = values.country;

		await runCreate<Customer>(
			{
				spinner: {
					loading: 'Creating customer...',
					success: 'Customer created',
					fail: 'Failed to create customer',
				},
				apiCall: (client) => client.post('/customers', body),
				onInteractive: (customer) => {
					console.log();
					console.log(`  Name:     ${customer.name ?? '-'}`);
					console.log(`  ID:       ${customer.id}`);
					console.log(`  Email:    ${customer.email ?? '-'}`);
					console.log(`  Phone:    ${customer.phone ?? '-'}`);
					console.log(`  Country:  ${customer.country ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
