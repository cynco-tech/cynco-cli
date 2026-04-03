import { Command } from '@commander-js/extra-typings';
import { runDelete } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const deleteBillCmd = new Command('delete')
	.alias('rm')
	.description('Delete a bill')
	.argument('<id>', 'Bill ID')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco bills delete bill_abc123', 'cynco bills delete bill_abc123 --yes'],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runDelete(
			id,
			opts.yes ?? false,
			{
				confirmMessage: `Delete bill ${id}? This cannot be undone.`,
				spinner: {
					loading: 'Deleting bill...',
					success: 'Bill deleted',
					fail: 'Failed to delete bill',
				},
				object: 'bill',
				successMsg: `Bill ${id} deleted.`,
				apiCall: (client) => client.delete(`/bills/${id}`),
			},
			globalOpts,
		);
	});
