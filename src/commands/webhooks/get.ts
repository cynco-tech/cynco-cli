import { Command } from '@commander-js/extra-typings';
import { runGet } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Webhook } from './utils';
import { renderWebhooksTable } from './utils';

export const getWebhookCmd = new Command('get')
	.description('Get a webhook by ID')
	.argument('<id>', 'Webhook ID')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco webhooks get wh_abc123', 'cynco webhooks get wh_abc123 --json'],
		}),
	)
	.action(async (id, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		await runGet<Webhook>(
			{
				spinner: {
					loading: 'Fetching webhook...',
					success: 'Webhook loaded',
					fail: 'Failed to fetch webhook',
				},
				apiCall: (client) => client.get(`/webhooks/${id}`),
				onInteractive: (webhook) => {
					console.log(renderWebhooksTable([webhook]));
				},
			},
			globalOpts,
		);
	});
