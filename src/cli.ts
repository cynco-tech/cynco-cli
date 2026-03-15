#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { accountsCmd } from './commands/accounts/index';
import { apiKeysCmd } from './commands/api-keys/index';
import { auth } from './commands/auth/index';
import { login } from './commands/auth/login';
import { logout } from './commands/auth/logout';
import { bankAccountsCmd } from './commands/bank-accounts/index';
import { bankTransactionsCmd } from './commands/bank-transactions/index';
import { billsCmd } from './commands/bills/index';
import { customersCmd } from './commands/customers/index';
import { doctor } from './commands/doctor';
import { invoicesCmd } from './commands/invoices/index';
import { itemsCmd } from './commands/items/index';
import { journalEntriesCmd } from './commands/journal-entries/index';
import { open } from './commands/open';
import { reportsCmd } from './commands/reports/index';
import { update } from './commands/update';
import { vendorsCmd } from './commands/vendors/index';
import { webhooksCmd } from './commands/webhooks/index';
import { whoami } from './commands/whoami';
import { errorMessage, outputError } from './lib/output';
import { checkForUpdates } from './lib/update-check';
import { PACKAGE_NAME, VERSION } from './lib/version';

const program = new Command()
	.name('cynco')
	.description('Cynco CLI — AI Native Accounting')
	.configureHelp({
		showGlobalOptions: true,
		styleTitle: (str) => pc.gray(str),
	})
	.configureOutput({
		writeErr: (str) => {
			process.stderr.write(str.replace(/^error:/, () => pc.red('error:')));
		},
	})
	.version(`${PACKAGE_NAME} v${VERSION}`, '-v, --version', 'Output the current version')
	.option('--api-key <key>', 'Cynco API key (overrides env/config)')
	.option('-p, --profile <name>', 'Profile to use (overrides CYNCO_PROFILE)')
	.option('--json', 'Force JSON output')
	.option('-q, --quiet', 'Suppress spinners and status output (implies --json)')
	.hook('preAction', (thisCommand, actionCommand) => {
		if (actionCommand.optsWithGlobals().quiet) {
			thisCommand.setOptionValue('json', true);
		}
	})
	.addHelpText(
		'after',
		`
${pc.gray('Environment:')}
  CYNCO_API_KEY       API key — checked after --api-key, before stored credentials
                      Priority: --api-key flag > CYNCO_API_KEY > ~/.config/cynco/credentials.json
  CYNCO_PROFILE       Profile — checked after --profile flag, before active_profile in config
                      Priority: --profile flag > CYNCO_PROFILE > active_profile in config > "default"
  CYNCO_API_URL       Base URL override (default: https://app.cynco.io)

${pc.gray('Output:')}
  Human-readable by default. Pass --json or pipe stdout for machine-readable JSON.
  Use --quiet (-q) in CI to suppress spinners and status messages (implies --json).
  Errors always exit with code 1: {"error":{"message":"...","code":"..."}}

${pc.gray('Examples:')}

- Login to Cynco

  ${pc.blue('$ cynco login')}

- List invoices

  ${pc.blue('$ cynco invoices list')}

- Create a customer

  ${pc.blue('$ cynco customers create --name "Acme Corp" --email acme@example.com')}

- Generate a report

  ${pc.blue('$ cynco reports generate --type trial_balance --period 2026-03')}
`,
	)
	// Top-level shortcuts
	.addCommand(login)
	.addCommand(logout)
	// Auth management
	.addCommand(auth)
	// Core resources
	.addCommand(invoicesCmd)
	.addCommand(customersCmd)
	.addCommand(vendorsCmd)
	.addCommand(billsCmd)
	.addCommand(itemsCmd)
	// Accounting
	.addCommand(accountsCmd)
	.addCommand(journalEntriesCmd)
	// Banking
	.addCommand(bankAccountsCmd)
	.addCommand(bankTransactionsCmd)
	// Reports
	.addCommand(reportsCmd)
	// Platform
	.addCommand(apiKeysCmd)
	.addCommand(webhooksCmd)
	// Utilities
	.addCommand(doctor)
	.addCommand(open)
	.addCommand(whoami)
	.addCommand(update);

program
	.parseAsync()
	.then(() => {
		const ran = program.args[0];
		if (ran === 'update') {
			return;
		}
		return checkForUpdates().catch(() => {});
	})
	.catch((err) => {
		const globalOpts = program.opts();
		outputError(
			{
				message: errorMessage(err, 'An unexpected error occurred'),
				code: 'unexpected_error',
			},
			{ json: globalOpts.json || globalOpts.quiet },
		);
	});
