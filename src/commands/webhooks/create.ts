import { Command } from '@commander-js/extra-typings';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { requireText } from '../../lib/prompts';
import type { Webhook } from './utils';
import { renderWebhooksTable } from './utils';

export const createWebhookCmd = new Command('create')
	.description('Create a new webhook endpoint')
	.option('--url <url>', 'Webhook endpoint URL')
	.option('--events <events>', 'Comma-separated events (e.g. invoice.created,payment.received)')
	.addHelpText(
		'after',
		buildHelpText({
			context:
				'Events: invoice.created, invoice.updated, invoice.paid, invoice.overdue,\n' +
				'  customer.created, customer.updated, payment.received, bill.created,\n' +
				'  bill.paid, vendor.created, vendor.updated',
			examples: [
				'cynco webhooks create --url https://example.com/hook --events "invoice.created,invoice.paid"',
				'cynco webhooks create --url https://example.com/hook --events "payment.received"',
				'cynco webhooks create',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const url = await requireText(
			opts.url,
			{ message: 'Webhook URL', placeholder: 'https://example.com/webhook' },
			{ message: '--url is required', code: 'missing_url' },
			globalOpts,
		);

		const eventsRaw = await requireText(
			opts.events,
			{ message: 'Events (comma-separated)', placeholder: 'invoice.created,payment.received' },
			{ message: '--events is required', code: 'missing_events' },
			globalOpts,
		);

		const events = eventsRaw.split(',').map((e) => e.trim());
		const body: Record<string, unknown> = { url, events };

		await runCreate<Webhook>(
			{
				spinner: {
					loading: 'Creating webhook...',
					success: 'Webhook created',
					fail: 'Failed to create webhook',
				},
				apiCall: (client) => client.post('/webhooks', body),
				onInteractive: (webhook) => {
					console.log(renderWebhooksTable([webhook]));
				},
			},
			globalOpts,
		);
	});
