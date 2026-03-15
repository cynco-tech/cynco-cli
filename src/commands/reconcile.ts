import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { runGet } from '../lib/actions';
import type { GlobalOpts } from '../lib/client';
import { formatMoney } from '../lib/format';
import { buildHelpText } from '../lib/help-text';
import { requireText } from '../lib/prompts';

interface ReconcileStatus {
	accountId: string;
	accountName?: string;
	currency?: string;
	bookBalance?: number;
	bankBalance?: number;
	difference?: number;
	totalTransactions?: number;
	reconciledCount?: number;
	unreconciledCount?: number;
	period?: string;
}

export const reconcileCmd = new Command('reconcile')
	.description('Bank reconciliation status')
	.option('--account-id <id>', 'Bank account ID')
	.option('--period <period>', 'Period to check (YYYY-MM)')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco reconcile --account-id fac_abc123',
				'cynco reconcile --account-id fac_abc123 --period 2026-03',
				'cynco reconcile --account-id fac_abc123 --json',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const accountId = await requireText(
			opts.accountId,
			{ message: 'Bank account ID', placeholder: 'fac_abc123' },
			{ message: '--account-id is required', code: 'missing_account_id' },
			globalOpts,
		);

		const params: Record<string, string> = { accountId };
		if (opts.period) params.period = opts.period;

		await runGet<ReconcileStatus>(
			{
				spinner: {
					loading: 'Fetching reconciliation status...',
					success: 'Reconciliation status loaded',
					fail: 'Failed to fetch reconciliation status',
				},
				apiCall: (client) => client.get('/reconciliation/status', params),
				onInteractive: (data) => {
					const diff = data.difference ?? 0;
					const isBalanced = Math.abs(diff) < 0.01;

					console.log('');
					console.log(`  ${pc.bold('Reconciliation Status')}`);
					if (data.accountName) console.log(`  ${pc.dim('Account:')}      ${data.accountName}`);
					if (data.period) console.log(`  ${pc.dim('Period:')}       ${data.period}`);
					console.log('');
					console.log(
						`  ${pc.dim('Book Balance:')}  ${formatMoney(data.bookBalance, data.currency)}`,
					);
					console.log(
						`  ${pc.dim('Bank Balance:')}  ${formatMoney(data.bankBalance, data.currency)}`,
					);
					console.log(
						`  ${pc.dim('Difference:')}   ${isBalanced ? pc.green(formatMoney(diff, data.currency)) : pc.red(formatMoney(diff, data.currency))}`,
					);
					console.log('');
					if (data.totalTransactions != null) {
						console.log(`  ${pc.dim('Transactions:')} ${data.totalTransactions}`);
					}
					if (data.reconciledCount != null) {
						console.log(`  ${pc.dim('Reconciled:')}   ${pc.green(String(data.reconciledCount))}`);
					}
					if (data.unreconciledCount != null) {
						console.log(
							`  ${pc.dim('Unreconciled:')} ${data.unreconciledCount > 0 ? pc.yellow(String(data.unreconciledCount)) : pc.green('0')}`,
						);
					}
					console.log('');
					console.log(
						`  ${isBalanced ? pc.green('Reconciled') : pc.yellow('Unreconciled — review pending items')}`,
					);
					console.log('');
				},
			},
			globalOpts,
		);
	});
