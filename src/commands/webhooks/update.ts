import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { mergeStdinWithFlags, readStdinJson } from '../../lib/stdin';
import type { Webhook } from './utils';

export const updateWebhookCmd = new Command('update')
	.description('Update a webhook endpoint')
	.argument('<id>', 'Webhook ID')
	.option('--url <url>', 'Webhook endpoint URL')
	.option('--events <events>', 'Comma-separated events (e.g. invoice.created,payment.received)')
	.option('--active <bool>', 'Enable or disable the webhook (true|false)')
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco webhooks update wh_abc123 --url https://new-url.com/hook',
				'cynco webhooks update wh_abc123 --events "invoice.created,invoice.paid"',
				'cynco webhooks update wh_abc123 --active false',
				'echo \'{"url":"https://new-url.com/hook"}\' | cynco webhooks update wh_abc123 --stdin',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let body: Record<string, unknown>;

		if (opts.stdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			body = mergeStdinWithFlags(stdinBody, {
				url: opts.url,
				events: opts.events ? opts.events.split(',').map((e: string) => e.trim()) : undefined,
				active: opts.active !== undefined ? opts.active === 'true' : undefined,
			});
		} else {
			body = {};
			if (opts.url) body.url = opts.url;
			if (opts.events) body.events = opts.events.split(',').map((e: string) => e.trim());
			if (opts.active) {
				if (opts.active !== 'true' && opts.active !== 'false') {
					outputError(
						{
							message: `Invalid --active value "${opts.active}". Must be "true" or "false".`,
							code: 'invalid_active',
						},
						{ json: globalOpts.json },
					);
				}
				body.active = opts.active === 'true';
			}

			if (Object.keys(body).length === 0) {
				outputError(
					{
						message: 'At least one of --url, --events, or --active must be provided',
						code: 'missing_fields',
					},
					{ json: globalOpts.json },
				);
			}
		}

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
				dryRunAction: `update webhook ${id}`,
				dryRunDiff: async (client) => {
					const result = await client.get<Webhook>(`/webhooks/${id}`);
					const current = (result.data ?? {}) as Record<string, unknown>;
					return { current, changes: body };
				},
			},
			globalOpts,
		);
	});
