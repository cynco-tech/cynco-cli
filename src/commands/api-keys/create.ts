import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { runCreate } from '../../lib/actions';
import type { GlobalOpts } from '../../lib/client';
import { buildHelpText } from '../../lib/help-text';
import { outputError } from '../../lib/output';
import { requireText } from '../../lib/prompts';
import { validateScopes } from './utils';

interface CreateApiKeyResponse {
	id: string;
	name: string;
	key: string;
	scopes: string[];
	createdAt: string;
}

export const createApiKeyCmd = new Command('create')
	.description('Create a new API key')
	.option('--name <name>', 'API key name')
	.option('--scopes <scopes>', 'Comma-separated scopes (e.g. invoices:read,customers:write)')
	.addHelpText(
		'after',
		buildHelpText({
			context:
				'Scopes: invoices:read, invoices:write, customers:read, customers:write,\n' +
				'  vendors:read, vendors:write, bills:read, bills:write, accounts:read,\n' +
				'  accounts:write, journal_entries:read, journal_entries:write,\n' +
				'  banking:read, banking:write, reports:read, items:read, items:write,\n' +
				'  webhooks:read, webhooks:write, *',
			examples: [
				'cynco api-keys create --name "CI/CD" --scopes "invoices:read,customers:read"',
				'cynco api-keys create --name "Full Access" --scopes "*"',
				'cynco api-keys create',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const name = await requireText(
			opts.name,
			{ message: 'API key name', placeholder: 'my-api-key' },
			{ message: '--name is required', code: 'missing_name' },
			globalOpts,
		);

		const scopesRaw = await requireText(
			opts.scopes,
			{ message: 'Scopes (comma-separated)', placeholder: 'invoices:read,customers:read' },
			{ message: '--scopes is required', code: 'missing_scopes' },
			globalOpts,
		);

		let scopes: string[];
		try {
			scopes = validateScopes(scopesRaw);
		} catch (err) {
			outputError(
				{ message: err instanceof Error ? err.message : 'Invalid scopes', code: 'invalid_scopes' },
				{ json: globalOpts.json },
			);
		}

		const body: Record<string, unknown> = { name, scopes };

		await runCreate<CreateApiKeyResponse>(
			{
				spinner: {
					loading: 'Creating API key...',
					success: 'API key created',
					fail: 'Failed to create API key',
				},
				apiCall: (client) => client.post('/api-keys', body),
				onInteractive: (result) => {
					console.log(`\n  ${pc.bold('Name:')}    ${result.name}`);
					console.log(`  ${pc.bold('ID:')}      ${result.id}`);
					console.log(`  ${pc.bold('Scopes:')}  ${result.scopes.join(', ')}`);
					console.log(`\n  ${pc.bold('API Key:')} ${pc.green(result.key)}`);
					console.log(`\n  ${pc.yellow('Save this key now. It will not be shown again.')}`);
				},
			},
			globalOpts,
		);
	});
