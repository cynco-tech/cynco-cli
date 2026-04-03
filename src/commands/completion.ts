import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import { buildHelpText } from '../lib/help-text';
import { outputError, outputResult } from '../lib/output';
import { isInteractive } from '../lib/tty';

const SHELLS = ['bash', 'zsh', 'fish'] as const;
type Shell = (typeof SHELLS)[number];

function bashCompletions(): string {
	return `# Cynco CLI bash completions
# Add to ~/.bashrc: eval "$(cynco completion bash)"
_cynco_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="login logout auth extract cash reconcile tb bs pl ar ap invoices customers vendors bills items accounts journal-entries bank-accounts bank-transactions reports api-keys webhooks ui doctor open whoami update completion"

  case "\${prev}" in
    cynco)
      COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
      return 0
      ;;
    invoices)
      COMPREPLY=( $(compgen -W "list get create overdue finalize send void record-payment" -- "\${cur}") )
      return 0
      ;;
    customers|vendors)
      COMPREPLY=( $(compgen -W "list get create update delete" -- "\${cur}") )
      return 0
      ;;
    bills)
      COMPREPLY=( $(compgen -W "list get create update delete" -- "\${cur}") )
      return 0
      ;;
    items)
      COMPREPLY=( $(compgen -W "list get create update delete" -- "\${cur}") )
      return 0
      ;;
    accounts|bank-accounts)
      COMPREPLY=( $(compgen -W "list get" -- "\${cur}") )
      return 0
      ;;
    journal-entries)
      COMPREPLY=( $(compgen -W "list get create batch" -- "\${cur}") )
      return 0
      ;;
    bank-transactions)
      COMPREPLY=( $(compgen -W "list get import" -- "\${cur}") )
      return 0
      ;;
    reports)
      COMPREPLY=( $(compgen -W "generate" -- "\${cur}") )
      return 0
      ;;
    api-keys)
      COMPREPLY=( $(compgen -W "list create delete" -- "\${cur}") )
      return 0
      ;;
    webhooks)
      COMPREPLY=( $(compgen -W "list get create update delete listen" -- "\${cur}") )
      return 0
      ;;
    auth)
      COMPREPLY=( $(compgen -W "login logout list switch rename remove" -- "\${cur}") )
      return 0
      ;;
    open)
      COMPREPLY=( $(compgen -W "dashboard invoices customers vendors bills reports settings api-keys" -- "\${cur}") )
      return 0
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      return 0
      ;;
  esac
}
complete -F _cynco_completions cynco`;
}

function zshCompletions(): string {
	return `#compdef cynco
# Cynco CLI zsh completions
# Add to ~/.zshrc: eval "$(cynco completion zsh)"

_cynco() {
  local -a commands subcommands

  commands=(
    'login:Log in to your Cynco account'
    'logout:Log out and remove stored credentials'
    'auth:Manage authentication profiles'
    'extract:Extract data from a document using AI'
    'cash:Show cash position'
    'reconcile:Bank reconciliation status'
    'tb:Generate Trial Balance'
    'bs:Generate Balance Sheet'
    'pl:Generate Profit & Loss'
    'ar:Generate Aged Receivables'
    'ap:Generate Aged Payables'
    'invoices:Manage invoices'
    'customers:Manage customers'
    'vendors:Manage vendors'
    'bills:Manage bills'
    'items:Manage items'
    'accounts:Chart of accounts'
    'journal-entries:Manage journal entries'
    'bank-accounts:Bank accounts'
    'bank-transactions:Bank transactions'
    'reports:Financial reports'
    'api-keys:Manage API keys'
    'webhooks:Manage webhooks'
    'ui:Launch interactive TUI dashboard'
    'doctor:Check CLI configuration'
    'open:Open Cynco in browser'
    'whoami:Show current auth status'
    'update:Check for CLI updates'
    'completion:Generate shell completions'
  )

  _arguments -C \\
    '--api-key[API key]:key:' \\
    '-p[Profile to use]:profile:' \\
    '--profile[Profile to use]:profile:' \\
    '--json[Force JSON output]' \\
    '-q[Suppress spinners]' \\
    '--quiet[Suppress spinners]' \\
    '-v[Show version]' \\
    '--version[Show version]' \\
    '1:command:->cmd' \\
    '*::arg:->args'

  case "$state" in
    cmd)
      _describe 'command' commands
      ;;
    args)
      case "$words[2]" in
        invoices)
          subcommands=('list:List invoices' 'get:Get invoice' 'create:Create invoice' 'overdue:List overdue' 'finalize:Finalize invoice' 'send:Send invoice' 'void:Void invoice' 'record-payment:Record payment')
          _describe 'subcommand' subcommands
          ;;
        customers|vendors)
          subcommands=('list:List' 'get:Get by ID' 'create:Create' 'update:Update' 'delete:Delete')
          _describe 'subcommand' subcommands
          ;;
        bills|items)
          subcommands=('list:List' 'get:Get by ID' 'create:Create' 'update:Update' 'delete:Delete')
          _describe 'subcommand' subcommands
          ;;
        auth)
          subcommands=('login:Log in' 'logout:Log out' 'list:List profiles' 'switch:Switch profile' 'rename:Rename profile' 'remove:Remove profile')
          _describe 'subcommand' subcommands
          ;;
        webhooks)
          subcommands=('list:List' 'get:Get by ID' 'create:Create' 'update:Update' 'delete:Delete' 'listen:Start listener')
          _describe 'subcommand' subcommands
          ;;
      esac
      ;;
  esac
}

_cynco "$@"`;
}

function fishCompletions(): string {
	return `# Cynco CLI fish completions
# Add to ~/.config/fish/completions/cynco.fish: cynco completion fish > ~/.config/fish/completions/cynco.fish

set -l commands login logout auth extract cash reconcile tb bs pl ar ap invoices customers vendors bills items accounts journal-entries bank-accounts bank-transactions reports api-keys webhooks ui doctor open whoami update completion

complete -c cynco -f
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a login -d "Log in"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a logout -d "Log out"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a auth -d "Manage profiles"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a extract -d "Extract document data"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a cash -d "Cash position"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a reconcile -d "Reconciliation status"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a tb -d "Trial Balance"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a bs -d "Balance Sheet"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a pl -d "Profit & Loss"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a ar -d "Aged Receivables"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a ap -d "Aged Payables"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a invoices -d "Manage invoices"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a customers -d "Manage customers"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a vendors -d "Manage vendors"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a bills -d "Manage bills"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a items -d "Manage items"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a accounts -d "Chart of accounts"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a "journal-entries" -d "Journal entries"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a "bank-accounts" -d "Bank accounts"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a "bank-transactions" -d "Bank transactions"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a reports -d "Financial reports"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a "api-keys" -d "API keys"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a webhooks -d "Webhooks"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a ui -d "TUI dashboard"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a doctor -d "Check config"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a open -d "Open in browser"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a whoami -d "Auth status"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a update -d "Check for updates"
complete -c cynco -n "not __fish_seen_subcommand_from $commands" -a completion -d "Shell completions"

# Global options
complete -c cynco -l api-key -d "API key"
complete -c cynco -s p -l profile -d "Profile name"
complete -c cynco -l json -d "JSON output"
complete -c cynco -s q -l quiet -d "Suppress spinners"

# Subcommands
complete -c cynco -n "__fish_seen_subcommand_from invoices" -a "list get create overdue finalize send void record-payment"
complete -c cynco -n "__fish_seen_subcommand_from customers" -a "list get create update delete"
complete -c cynco -n "__fish_seen_subcommand_from vendors" -a "list get create update delete"
complete -c cynco -n "__fish_seen_subcommand_from bills" -a "list get create update delete"
complete -c cynco -n "__fish_seen_subcommand_from items" -a "list get create update delete"
complete -c cynco -n "__fish_seen_subcommand_from accounts" -a "list get"
complete -c cynco -n "__fish_seen_subcommand_from journal-entries" -a "list get create batch"
complete -c cynco -n "__fish_seen_subcommand_from bank-accounts" -a "list get"
complete -c cynco -n "__fish_seen_subcommand_from bank-transactions" -a "list get import"
complete -c cynco -n "__fish_seen_subcommand_from reports" -a generate
complete -c cynco -n "__fish_seen_subcommand_from api-keys" -a "list create delete"
complete -c cynco -n "__fish_seen_subcommand_from webhooks" -a "list get create update delete listen"
complete -c cynco -n "__fish_seen_subcommand_from auth" -a "login logout list switch rename remove"
complete -c cynco -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"`;
}

function detectShell(): Shell | null {
	const shellEnv = process.env.SHELL ?? '';
	if (shellEnv.endsWith('/zsh')) return 'zsh';
	if (shellEnv.endsWith('/bash')) return 'bash';
	if (shellEnv.endsWith('/fish')) return 'fish';
	return null;
}

function getConfigPath(shell: Shell): string {
	const home = homedir();
	switch (shell) {
		case 'bash':
			return join(home, '.bashrc');
		case 'zsh':
			return join(home, '.zshrc');
		case 'fish':
			return join(home, '.config', 'fish', 'completions', 'cynco.fish');
	}
}

function getEvalLine(shell: Shell): string {
	switch (shell) {
		case 'bash':
			return 'eval "$(cynco completion bash)"';
		case 'zsh':
			return 'eval "$(cynco completion zsh)"';
		case 'fish':
			return ''; // fish uses file directly, not eval
	}
}

const installCmd = new Command('install')
	.description('Auto-install completions for your shell')
	.option('--dry-run', 'Show what would be written without writing')
	.addHelpText(
		'after',
		buildHelpText({
			context: 'Detects your shell from $SHELL and installs completions automatically.',
			examples: ['cynco completion install', 'cynco completion install --dry-run'],
		}),
	)
	.action((opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		const shell = detectShell();
		if (!shell) {
			outputError(
				{
					message: `Could not detect shell from $SHELL="${process.env.SHELL ?? ''}". Run manually: cynco completion bash|zsh|fish`,
					code: 'unknown_shell',
				},
				{ json: globalOpts.json },
			);
			return;
		}

		const configPath = getConfigPath(shell);

		if (shell === 'fish') {
			// Fish uses a file, not an eval line
			const script = fishCompletions();

			if (opts.dryRun) {
				if (!globalOpts.json && isInteractive()) {
					console.log(`Would write fish completions to ${pc.cyan(configPath)}`);
				} else {
					outputResult({ shell, configPath, action: 'dry_run' }, { json: globalOpts.json });
				}
				return;
			}

			const dir = dirname(configPath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(configPath, script, 'utf-8');

			if (!globalOpts.json && isInteractive()) {
				console.log(`${pc.green('Completions installed!')} Written to ${pc.cyan(configPath)}`);
				console.log(`${pc.dim('Restart your shell or run:')} source ${configPath}`);
			} else {
				outputResult({ shell, configPath, action: 'installed' }, { json: globalOpts.json });
			}
			return;
		}

		// bash/zsh: append eval line to rc file
		const evalLine = getEvalLine(shell);

		// Check if already installed
		try {
			const content = readFileSync(configPath, 'utf-8');
			if (content.includes('cynco completion')) {
				if (!globalOpts.json && isInteractive()) {
					console.log(`${pc.green('Already installed!')} Found in ${pc.cyan(configPath)}`);
				} else {
					outputResult(
						{ shell, configPath, action: 'already_installed' },
						{ json: globalOpts.json },
					);
				}
				return;
			}
		} catch {
			// File doesn't exist — proceed to write
		}

		if (opts.dryRun) {
			if (!globalOpts.json && isInteractive()) {
				console.log(`Would append to ${pc.cyan(configPath)}:`);
				console.log(`  ${pc.dim(evalLine)}`);
			} else {
				outputResult({ shell, configPath, evalLine, action: 'dry_run' }, { json: globalOpts.json });
			}
			return;
		}

		writeFileSync(configPath, `\n# Cynco CLI completions\n${evalLine}\n`, { flag: 'a' });

		if (!globalOpts.json && isInteractive()) {
			console.log(`${pc.green('Completions installed!')} Added to ${pc.cyan(configPath)}`);
			console.log(`${pc.dim('Restart your shell or run:')} source ${configPath}`);
		} else {
			outputResult({ shell, configPath, action: 'installed' }, { json: globalOpts.json });
		}
	});

export const completionCmd = new Command('completion')
	.description('Generate shell completion scripts')
	.argument('[shell]', 'Shell type: bash, zsh, or fish')
	.addCommand(installCmd)
	.addHelpText(
		'after',
		buildHelpText({
			context:
				'Outputs completion script to stdout. Pipe or eval to install.\n  Or use: cynco completion install (auto-detects shell)',
			examples: [
				'cynco completion install',
				'cynco completion install --dry-run',
				'cynco completion bash >> ~/.bashrc',
				'eval "$(cynco completion zsh)"',
				'cynco completion fish > ~/.config/fish/completions/cynco.fish',
			],
		}),
	)
	.action((shell, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		if (!shell) {
			cmd.help();
			return;
		}

		if (!SHELLS.includes(shell as Shell)) {
			outputError(
				{
					message: `Unknown shell "${shell}". Supported: ${SHELLS.join(', ')}`,
					code: 'invalid_shell',
				},
				{ json: globalOpts.json },
			);
			return;
		}

		const generators: Record<Shell, () => string> = {
			bash: bashCompletions,
			zsh: zshCompletions,
			fish: fishCompletions,
		};

		console.log(generators[shell as Shell]());
	});
