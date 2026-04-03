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
import { cashCmd } from './commands/cash';
import { completionCmd } from './commands/completion';
import { configCmd } from './commands/config';
import { customersCmd } from './commands/customers/index';
import { doctor } from './commands/doctor';
import { extractCmd } from './commands/extract';
import { historyCmd } from './commands/history';
import { invoicesCmd } from './commands/invoices/index';
import { itemsCmd } from './commands/items/index';
import { journalEntriesCmd } from './commands/journal-entries/index';
import { mcpCmd } from './commands/mcp';
import { open } from './commands/open';
import { reconcileCmd } from './commands/reconcile';
import { apCmd, arCmd, bsCmd, plCmd, tbCmd } from './commands/report-shortcuts';
import { reportsCmd } from './commands/reports/index';
import { statusCmd } from './commands/status';
import { uiCmd } from './commands/ui';
import { update } from './commands/update';
import { vendorsCmd } from './commands/vendors/index';
import { webhooksCmd } from './commands/webhooks/index';
import { whoami } from './commands/whoami';
import { getBrandingText, getQuickStart } from './lib/branding';
import type { GlobalOpts } from './lib/client';
import { setVerbose } from './lib/client';
import { appendHistory } from './lib/history';
import { errorMessage, isValidOutputFormat, outputError } from './lib/output';
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
	.option('--agent', 'Agent mode: JSON output, no prompts or spinners')
	.option('-n, --dry-run', 'Preview destructive operations without executing')
	.option('--verbose', 'Show request/response details for debugging')
	.option('-o, --output <format>', 'Output format: table, json, csv')
	.hook('preAction', (thisCommand, actionCommand) => {
		const opts = actionCommand.optsWithGlobals() as GlobalOpts;
		if (opts.agent || process.env.CYNCO_AGENT === '1') {
			thisCommand.setOptionValue('json', true);
			thisCommand.setOptionValue('quiet', true);
		}
		if (opts.quiet) {
			thisCommand.setOptionValue('json', true);
		}
		if (opts.verbose) {
			setVerbose(true);
		}
		if (opts.output) {
			if (!isValidOutputFormat(opts.output)) {
				process.stderr.write(
					`${pc.red('error:')} Invalid output format "${opts.output}". Must be one of: table, json, csv\n`,
				);
				process.exit(1);
			}
			if (opts.output === 'json') {
				thisCommand.setOptionValue('json', true);
			}
		}
		// Record start time for history
		(actionCommand as unknown as Record<string, number>)._startTime = Date.now();
	})
	.hook('postAction', (_thisCommand, actionCommand) => {
		const startTime = (actionCommand as unknown as Record<string, number>)._startTime;
		const cmdName = actionCommand.parent
			? `${actionCommand.parent.name()} ${actionCommand.name()}`
			: actionCommand.name();
		appendHistory({
			timestamp: new Date().toISOString(),
			command: cmdName,
			exitCode: 0,
			durationMs: startTime ? Date.now() - startTime : 0,
		});
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
  CYNCO_AGENT=1       Enable agent mode — equivalent to --agent (JSON output, no prompts)

${pc.gray('Output:')}
  Human-readable by default. Pass --json or pipe stdout for machine-readable JSON.
  Use --quiet (-q) in CI to suppress spinners and status messages (implies --json).
  Errors always exit with code 1: {"error":{"message":"...","code":"..."}}

${pc.gray('Examples:')}

- Extract data from a document
  ${pc.blue('$ cynco extract ./invoice.pdf')}

- Show cash position
  ${pc.blue('$ cynco cash')}

- List overdue invoices
  ${pc.blue('$ cynco invoices overdue')}

- Generate a Trial Balance
  ${pc.blue('$ cynco tb --period 2026-03')}

- Create a customer
  ${pc.blue('$ cynco customers create --name "Acme Corp" --email acme@example.com')}

- Record a payment
  ${pc.blue('$ cynco invoices record-payment inv_abc123 --amount 1500')}
`,
	)
	// Top-level shortcuts
	.addCommand(login)
	.addCommand(logout)
	// Auth management
	.addCommand(auth)
	// AI & extraction
	.addCommand(extractCmd)
	// Quick views
	.addCommand(statusCmd)
	.addCommand(cashCmd)
	.addCommand(reconcileCmd)
	// Report shortcuts
	.addCommand(tbCmd)
	.addCommand(bsCmd)
	.addCommand(plCmd)
	.addCommand(arCmd)
	.addCommand(apCmd)
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
	// MCP
	.addCommand(mcpCmd)
	// Interactive
	.addCommand(uiCmd)
	// Settings
	.addCommand(configCmd)
	// History
	.addCommand(historyCmd)
	// Utilities
	.addCommand(doctor)
	.addCommand(open)
	.addCommand(whoami)
	.addCommand(update)
	.addCommand(completionCmd)
	.action(() => {
		// Bare `cynco` with no subcommand — show branding
		const branding = getBrandingText();
		if (branding) {
			process.stderr.write(branding);
			process.stderr.write(getQuickStart());
		} else {
			program.help();
		}
	});

program
	.parseAsync()
	.then(() => {
		const ran = program.args[0];
		if (ran === 'update' || ran === 'completion') {
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
			{ json: globalOpts.json || globalOpts.quiet || globalOpts.agent },
		);
	});
