export interface HelpTextOptions {
	context?: string;
	output?: string;
	errorCodes?: string[];
	examples: string[];
	setup?: boolean;
}

const GLOBAL_OPTS_FULL = `Global options:
  --api-key <key>       API key (or set CYNCO_API_KEY env var)
  -p, --profile <name>  Profile to use (overrides CYNCO_PROFILE)
  --json                Force JSON output (also auto-enabled when stdout is piped)
  -q, --quiet           Suppress spinners and status output (implies --json)`;

const GLOBAL_OPTS_SETUP = `Global options:
  -p, --profile <name>  Profile to use
  --json                Force JSON output
  -q, --quiet           Suppress spinners and status output (implies --json)`;

const ERROR_ENVELOPE = `  {"error":{"message":"<message>","code":"<code>"}}`;

export function buildHelpText(opts: HelpTextOptions): string {
	const parts: string[] = [];
	if (opts.context != null) {
		parts.push(opts.context);
	}
	parts.push(opts.setup ? GLOBAL_OPTS_SETUP : GLOBAL_OPTS_FULL);
	if (opts.output != null) {
		parts.push(`Output (--json or piped):\n${opts.output}`);
	}
	if (opts.errorCodes != null) {
		parts.push(`Errors (exit code 1):\n${ERROR_ENVELOPE}\n  Codes: ${opts.errorCodes.join(' | ')}`);
	}
	parts.push(`Examples:\n${opts.examples.map((e) => `  $ ${e}`).join('\n')}`);
	return `\n${parts.join('\n\n')}`;
}
