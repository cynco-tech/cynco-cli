import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Item } from './utils';
import { renderItemsTable } from './utils';

export const getItemCmd = new Command('get')
	.description('Get an item by ID')
	.argument('<id>', 'Item ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco items get itm_abc123', 'cynco items get itm_abc123 --json'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runGet<Item>(
			{
				spinner: {
					loading: 'Fetching item...',
					success: 'Item loaded',
					fail: 'Failed to fetch item',
				},
				apiCall: (client) => client.get(`/items/${id}`),
				onInteractive: (item) => {
					console.log(renderItemsTable([item]));
				},
			},
			globalOpts,
		);
	});
