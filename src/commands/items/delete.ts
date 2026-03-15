import { Command } from '@commander-js/extra-typings';
import { runDelete } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const deleteItemCmd = new Command('delete')
	.alias('rm')
	.description('Delete an item')
	.argument('<id>', 'Item ID')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco items delete itm_abc123', 'cynco items delete itm_abc123 --yes'],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runDelete(
			id,
			!!opts.yes,
			{
				confirmMessage: `Delete item ${id}? This cannot be undone.`,
				spinner: {
					loading: 'Deleting item...',
					success: 'Item deleted',
					fail: 'Failed to delete item',
				},
				object: 'item',
				successMsg: `Item ${id} deleted.`,
				apiCall: (client) => client.delete(`/items/${id}`),
			},
			globalOpts,
		);
	});
