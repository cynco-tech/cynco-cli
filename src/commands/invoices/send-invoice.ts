import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';

interface SendResult {
	id: string;
	sentTo?: string;
	sentAt?: string;
}

export const sendInvoiceCmd = new Command('send')
	.description('Send an invoice to the customer via email')
	.argument('<id>', 'Invoice ID')
	.option('--email <email>', 'Override recipient email address')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices send inv_abc123',
				'cynco invoices send inv_abc123 --email billing@acme.com',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const body: Record<string, unknown> = {};
		if (opts.email) body.email = opts.email;

		await runWrite<SendResult>(
			{
				spinner: {
					loading: 'Sending invoice...',
					success: 'Invoice sent',
					fail: 'Failed to send invoice',
				},
				apiCall: (client) => client.post(`/invoices/${id}/send`, body),
				errorCode: 'send_error',
				successMsg: `Invoice ${id} sent${opts.email ? ` to ${opts.email}` : ''}.`,
			},
			globalOpts,
		);
	});
