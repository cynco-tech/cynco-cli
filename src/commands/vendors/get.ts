import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Vendor } from './utils';

export const getVendorCmd = new Command('get')
	.description('Get a vendor by ID')
	.argument('<id>', 'Vendor ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco vendors get vend_abc123', 'cynco vendors get vend_abc123 --json'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runGet<Vendor>(
			{
				spinner: {
					loading: 'Fetching vendor...',
					success: 'Vendor loaded',
					fail: 'Failed to fetch vendor',
				},
				apiCall: (client) => client.get('/vendors', { id }),
				onInteractive: (vendor) => {
					console.log();
					console.log(`  Name:     ${vendor.name ?? '-'}`);
					console.log(`  ID:       ${vendor.id}`);
					console.log(`  Email:    ${vendor.email ?? '-'}`);
					console.log(`  Phone:    ${vendor.phone ?? '-'}`);
					console.log(`  Country:  ${vendor.country ?? '-'}`);
					console.log(`  Created:  ${vendor.createdAt ?? '-'}`);
					console.log();
				},
			},
			globalOpts,
		);
	});
