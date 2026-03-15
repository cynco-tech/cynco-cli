import { Command } from '@commander-js/extra-typings';
import { runDelete } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

export const deleteWebhookCmd = new Command('delete')
	.alias('rm')
	.description('Delete a webhook endpoint')
	.argument('<id>', 'Webhook ID')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco webhooks delete wh_abc123', 'cynco webhooks delete wh_abc123 --yes'],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runDelete(
			id,
			!!opts.yes,
			{
				confirmMessage: `Delete webhook ${id}? This cannot be undone.`,
				spinner: {
					loading: 'Deleting webhook...',
					success: 'Webhook deleted',
					fail: 'Failed to delete webhook',
				},
				object: 'webhook',
				successMsg: `Webhook ${id} deleted.`,
				apiCall: (client) => client.delete(`/webhooks/${id}`),
			},
			globalOpts,
		);
	});
