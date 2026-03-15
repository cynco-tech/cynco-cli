import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import type { Webhook } from './utils';

export const updateWebhookCmd = new Command('update')
	.description('Update a webhook endpoint')
	.argument('<id>', 'Webhook ID')
	.option('--url <url>', 'Webhook endpoint URL')
	.option('--events <events>', 'Comma-separated events (e.g. invoice.created,payment.received)')
	.option('--active <bool>', 'Enable or disable the webhook (true|false)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco webhooks update wh_abc123 --url https://new-url.com/hook',
				'cynco webhooks update wh_abc123 --events "invoice.created,invoice.paid"',
				'cynco webhooks update wh_abc123 --active false',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const body: Record<string, unknown> = {};
		if (opts.url) body.url = opts.url;
		if (opts.events) body.events = opts.events.split(',').map((e: string) => e.trim());
		if (opts.active) body.active = opts.active === 'true';

		await runWrite<Webhook>(
			{
				spinner: {
					loading: 'Updating webhook...',
					success: 'Webhook updated',
					fail: 'Failed to update webhook',
				},
				apiCall: (client) => client.patch(`/webhooks/${id}`, body),
				errorCode: 'update_error',
				successMsg: `Webhook ${id} updated.`,
			},
			globalOpts,
		);
	});
