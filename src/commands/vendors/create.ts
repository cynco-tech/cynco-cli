import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { promptForMissing } from '../../lib/prompts';
import type { Vendor } from './utils';

export const createVendorCmd = new Command('create')
	.description('Create a new vendor')
	.option('--name <name>', 'Vendor name')
	.option('--email <email>', 'Vendor email')
	.option('--phone <phone>', 'Phone number')
	.option('--country <code>', 'Country code (e.g. MY, US, SG)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco vendors create',
				'cynco vendors create --name "Supplier Co"',
				'cynco vendors create --name "Supplier Co" --email supplier@example.com --country MY',
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
				{ flag: 'name', message: 'Vendor name', placeholder: 'Supplier Co' },
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

		await runCreate<Vendor>(
			{
				spinner: {
					loading: 'Creating vendor...',
					success: 'Vendor created',
					fail: 'Failed to create vendor',
				},
				apiCall: (client) => client.post('/vendors', body),
				onInteractive: (vendor) => {
					console.log();
					console.log(`  Name:     ${vendor.name ?? '-'}`);
					console.log(`  ID:       ${vendor.id}`);
					console.log(`  Email:    ${vendor.email ?? '-'}`);
					console.log(`  Phone:    ${vendor.phone ?? '-'}`);
					console.log(`  Country:  ${vendor.country ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
