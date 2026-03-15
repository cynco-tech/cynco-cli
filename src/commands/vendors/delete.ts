import { Command } from '@commander-js/extra-typings';
import { runDelete } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const deleteVendorCmd = new Command('delete')
	.alias('rm')
	.description('Delete a vendor')
	.argument('<id>', 'Vendor ID')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco vendors delete vend_abc123', 'cynco vendors delete vend_abc123 --yes'],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runDelete(
			id,
			opts.yes ?? false,
			{
				confirmMessage: `Delete vendor ${id}? This cannot be undone.`,
				spinner: {
					loading: 'Deleting vendor...',
					success: 'Vendor deleted',
					fail: 'Failed to delete vendor',
				},
				object: 'vendor',
				successMsg: `Vendor ${id} deleted.`,
				apiCall: (client) => client.delete(`/vendors?id=${encodeURIComponent(id)}`),
			},
			globalOpts,
		);
	});
