import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { formatMoney } from '../../lib/format';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { requireText } from '../../lib/prompts';

interface PaymentResult {
	id: string;
	invoiceId: string;
	amount: number;
	currency?: string;
	date?: string;
	method?: string;
}

export const recordPaymentCmd = new Command('record-payment')
	.description('Record a payment against an invoice')
	.argument('<id>', 'Invoice ID')
	.option('--amount <amount>', 'Payment amount')
	.option('--date <date>', 'Payment date (YYYY-MM-DD)')
	.option('--method <method>', 'Payment method (cash, bank_transfer, card, cheque)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco invoices record-payment inv_abc123 --amount 1500.00',
				'cynco invoices record-payment inv_abc123 --amount 500 --date 2026-03-15 --method bank_transfer',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const amountStr = await requireText(
			opts.amount,
			{ message: 'Payment amount', placeholder: '1000.00' },
			{ message: '--amount is required', code: 'missing_amount' },
			globalOpts,
		);

		const amount = parseFloat(amountStr);
		if (Number.isNaN(amount) || amount <= 0) {
			outputError(
				{ message: 'Amount must be a positive number', code: 'invalid_amount' },
				{ json: globalOpts.json },
			);
		}

		const body: Record<string, unknown> = { amount };
		if (opts.date) body.date = opts.date;
		if (opts.method) body.method = opts.method;

		await runCreate<PaymentResult>(
			{
				spinner: {
					loading: 'Recording payment...',
					success: 'Payment recorded',
					fail: 'Failed to record payment',
				},
				apiCall: (client) => client.post(`/invoices/${id}/payments`, body),
				onInteractive: (result) => {
					console.log('');
					console.log(`  ${pc.bold('Payment recorded')}`);
					console.log(`  ${pc.dim('Invoice:')}  ${result.invoiceId}`);
					console.log(
						`  ${pc.dim('Amount:')}   ${pc.green(formatMoney(result.amount, result.currency))}`,
					);
					if (result.date) console.log(`  ${pc.dim('Date:')}     ${result.date}`);
					if (result.method) console.log(`  ${pc.dim('Method:')}   ${result.method}`);
					console.log('');
				},
			},
			globalOpts,
		);
	});
