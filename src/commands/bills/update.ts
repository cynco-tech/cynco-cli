import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { mergeStdinWithFlags, readStdinJson } from '../../lib/stdin';
import type { Bill } from './utils';

export const updateBillCmd = new Command('update')
	.description('Update a bill')
	.argument('<id>', 'Bill ID')
	.option('--status <status>', 'Bill status')
	.option('--due-date <date>', 'Due date (YYYY-MM-DD)')
	.option('--currency <code>', 'Currency code')
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco bills update bill_abc123 --status finalized',
				'cynco bills update bill_abc123 --due-date 2026-04-01',
				'cynco bills update bill_abc123 --currency USD',
				'echo \'{"status":"finalized"}\' | cynco bills update bill_abc123 --stdin',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let body: Record<string, unknown>;

		if (opts.stdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			body = mergeStdinWithFlags(stdinBody, {
				status: opts.status,
				dueDate: opts.dueDate,
				currency: opts.currency,
			});
			body.id = id;
		} else {
			body = { id };
			if (opts.status) body.status = opts.status;
			if (opts.dueDate) body.dueDate = opts.dueDate;
			if (opts.currency) body.currency = opts.currency;

			if (!opts.status && !opts.dueDate && !opts.currency) {
				outputError(
					{
						message: 'At least one field must be provided: --status, --due-date, or --currency',
						code: 'missing_fields',
					},
					{ json: globalOpts.json },
				);
				return;
			}
		}

		await runWrite<Bill>(
			{
				spinner: {
					loading: 'Updating bill...',
					success: 'Bill updated',
					fail: 'Failed to update bill',
				},
				apiCall: (client) => client.patch('/bills', body),
				errorCode: 'update_error',
				successMsg: `Bill ${id} updated.`,
				dryRunAction: `update bill ${id}`,
				dryRunDiff: async (client) => {
					const result = await client.get<Bill>(`/bills/${id}`);
					const current = (result.data ?? {}) as Record<string, unknown>;
					const { id: _id, ...changes } = body;
					return { current, changes };
				},
			},
			globalOpts,
		);
	});
