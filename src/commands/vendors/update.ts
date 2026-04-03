import { Command } from '@commander-js/extra-typings';
import { runWrite } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { mergeStdinWithFlags, readStdinJson } from '../../lib/stdin';
import type { Vendor } from './utils';

export const updateVendorCmd = new Command('update')
	.description('Update a vendor')
	.argument('<id>', 'Vendor ID')
	.option('--name <name>', 'Vendor name')
	.option('--email <email>', 'Vendor email')
	.option('--phone <phone>', 'Phone number')
	.option('--stdin', 'Read JSON body from stdin')
	.addHelpText(
		'after',
		buildHelpText({
			examples: [
				'cynco vendors update vend_abc123 --name "New Name"',
				'cynco vendors update vend_abc123 --email new@example.com',
				'cynco vendors update vend_abc123 --name "New Name" --phone "+60123456789"',
				'echo \'{"name":"New Name"}\' | cynco vendors update vend_abc123 --stdin',
			],
		}),
	)
	.action(async (id, opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let body: Record<string, unknown>;

		if (opts.stdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			body = mergeStdinWithFlags(stdinBody, {
				name: opts.name,
				email: opts.email,
				phone: opts.phone,
			});
			body.id = id;
		} else {
			body = { id };
			if (opts.name) body.name = opts.name;
			if (opts.email) body.email = opts.email;
			if (opts.phone) body.phone = opts.phone;

			if (!opts.name && !opts.email && !opts.phone) {
				outputError(
					{
						message: 'At least one field must be provided: --name, --email, or --phone',
						code: 'missing_fields',
					},
					{ json: globalOpts.json },
				);
			}
		}

		await runWrite<Vendor>(
			{
				spinner: {
					loading: 'Updating vendor...',
					success: 'Vendor updated',
					fail: 'Failed to update vendor',
				},
				apiCall: (client) => client.patch('/vendors', body),
				errorCode: 'update_error',
				successMsg: `Vendor ${id} updated.`,
				dryRunAction: `update vendor ${id}`,
				dryRunDiff: async (client) => {
					const result = await client.get<Vendor>(`/vendors/${id}`);
					const current = (result.data ?? {}) as Record<string, unknown>;
					const { id: _id, ...changes } = body;
					return { current, changes };
				},
			},
			globalOpts,
		);
	});
