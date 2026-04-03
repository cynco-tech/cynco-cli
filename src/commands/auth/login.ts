import * as p from '@clack/prompts';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { openBrowser } from '../../lib/browser';
import { CyncoClient, DEFAULT_BASE_URL, type GlobalOpts } from '../../lib/client';
import { listProfiles, readCredentials, storeApiKey } from '../../lib/config';
import { buildHelpText } from '../../lib/help-text';
import { outputError, outputResult } from '../../lib/output';
import { cancelAndExit } from '../../lib/prompts';
import { createSpinner } from '../../lib/spinner';
import { readStdinJson } from '../../lib/stdin';
import { isInteractive } from '../../lib/tty';
import { VERSION } from '../../lib/version';

const API_KEYS_URL = 'https://app.cynco.io/settings/api-keys';
const KEY_PREFIX = 'cak_';
const POLL_INTERVAL = 2000;
const MAX_POLLS = 150; // 5 minutes

function getBaseUrl(): string {
	return process.env.CYNCO_API_URL || DEFAULT_BASE_URL;
}

async function browserAuthFlow(globalOpts: GlobalOpts): Promise<string | null> {
	const baseUrl = getBaseUrl();

	const startSpinner = createSpinner('Creating secure session...', globalOpts.quiet);

	let sessionId: string;
	let deviceCode: string;
	let verificationUri: string;

	try {
		const res = await fetch(`${baseUrl}/api/cli/auth/start`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': `cynco-cli/${VERSION}`,
			},
			signal: AbortSignal.timeout(10000),
		});
		const data = (await res.json()) as {
			success: boolean;
			data?: { sessionId: string; deviceCode: string; verificationUri: string };
			error?: { message: string };
		};

		if (!data.success || !data.data) {
			startSpinner.fail('Failed to start authentication');
			process.stderr.write(
				`\n  ${pc.red(data.error?.message || 'Could not create auth session')}\n\n`,
			);
			return null;
		}

		sessionId = data.data.sessionId;
		deviceCode = data.data.deviceCode;
		verificationUri = data.data.verificationUri;
		startSpinner.stop('Session created');
	} catch {
		startSpinner.fail('Could not reach Cynco');
		process.stderr.write(`\n  ${pc.dim('Make sure')} ${baseUrl} ${pc.dim('is reachable.')}\n\n`);
		return null;
	}

	// Show device code prominently
	process.stderr.write('\n');
	process.stderr.write(`  ${pc.dim('Your verification code:')}\n`);
	process.stderr.write(`\n  ${pc.bold(pc.cyan(`  ${deviceCode}  `))}\n\n`);
	process.stderr.write(`  ${pc.dim('Confirm this code matches your browser to continue.')}\n\n`);

	const browserUrl = `${verificationUri}?code=${deviceCode}`;
	const opened = await openBrowser(browserUrl);
	if (!opened) {
		process.stderr.write(`  ${pc.dim('Open this URL in your browser:')}\n`);
		process.stderr.write(`  ${pc.cyan(browserUrl)}\n\n`);
	}

	const pollSpinner = createSpinner('Waiting for browser authorization...', globalOpts.quiet);

	for (let i = 0; i < MAX_POLLS; i++) {
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

		try {
			const res = await fetch(`${baseUrl}/api/cli/auth/poll?sessionId=${sessionId}`, {
				signal: AbortSignal.timeout(5000),
			});
			const data = (await res.json()) as {
				success: boolean;
				data?: { status: string; apiKey?: string };
				error?: { code?: string; message: string };
			};

			if (data.success && data.data?.status === 'approved' && data.data.apiKey) {
				pollSpinner.stop('Authorized');
				return data.data.apiKey;
			}

			if (data.success && data.data?.status === 'pending') {
				continue;
			}

			if (!data.success) {
				const code = data.error?.code;
				if (code === 'SESSION_EXPIRED') {
					pollSpinner.fail('Session expired');
					process.stderr.write(`\n  ${pc.dim('Run')} cynco login ${pc.dim('to try again.')}\n\n`);
					return null;
				}
				if (code === 'SESSION_CONSUMED') {
					pollSpinner.fail('Session already used');
					process.stderr.write(
						`\n  ${pc.dim('Run')} cynco login ${pc.dim('to start a new session.')}\n\n`,
					);
					return null;
				}
			}
		} catch {}
	}

	pollSpinner.fail('Timed out after 5 minutes');
	process.stderr.write(`\n  ${pc.dim('Run')} cynco login ${pc.dim('to try again.')}\n\n`);
	return null;
}

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
	try {
		const client = new CyncoClient(apiKey);
		const result = await client.get<unknown>('/accounts');
		if (result.error) {
			return { valid: false, error: result.error.message };
		}
		return { valid: true };
	} catch (err) {
		return {
			valid: false,
			error: err instanceof Error ? err.message : 'Connection failed',
		};
	}
}

function showPostLoginHelp(): void {
	process.stderr.write('\n');
	process.stderr.write(`  ${pc.dim('What\u2019s next?')}\n`);
	process.stderr.write('\n');
	process.stderr.write(
		`  ${pc.dim('$')} cynco status            ${pc.dim('Business health overview')}\n`,
	);
	process.stderr.write(
		`  ${pc.dim('$')} cynco invoices list      ${pc.dim('View your invoices')}\n`,
	);
	process.stderr.write(
		`  ${pc.dim('$')} cynco extract file.pdf   ${pc.dim('AI document extraction')}\n`,
	);
	process.stderr.write(
		`  ${pc.dim('$')} cynco doctor             ${pc.dim('Verify connectivity')}\n`,
	);
	process.stderr.write('\n');
}

export const login = new Command('login')
	.description('Log in to your Cynco account')
	.option('-k, --key <key>', 'API key (skips interactive prompt)')
	.option('--token-stdin', 'Read API key from stdin (for CI/automation)')
	.option('--profile <name>', 'Profile name to store the key under', 'default')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: [
				'cynco login',
				'cynco login --key cak_1234567890',
				'cynco login --key cak_1234567890 --profile production',
				'echo $CYNCO_KEY | cynco login --token-stdin',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		let apiKey = opts.key;
		let usedBrowserAuth = false;

		// Token from stdin (CI/automation)
		if (opts.tokenStdin) {
			const stdinBody = readStdinJson(globalOpts.json);
			apiKey = (stdinBody.token ?? stdinBody.apiKey ?? stdinBody.key) as string | undefined;
			if (!apiKey || typeof apiKey !== 'string') {
				// Try reading raw text from stdin instead
				outputError(
					{
						message:
							'No token found on stdin. Expected JSON with "token", "apiKey", or "key" field.',
						code: 'stdin_error',
					},
					{ json: globalOpts.json },
				);
			}
		}

		if (!apiKey) {
			if (!isInteractive() || globalOpts.json) {
				outputError(
					{
						message: 'No API key provided. Use --key or --token-stdin in non-interactive mode.',
						code: 'missing_key',
					},
					{ json: globalOpts.json },
				);
			}

			process.stderr.write('\n');
			p.intro(pc.bold('Cynco'));

			// Check for existing credentials
			const creds = readCredentials();
			if (creds && Object.keys(creds.profiles).length > 0) {
				const profileCount = Object.keys(creds.profiles).length;
				p.log.info(
					`${profileCount} profile${profileCount > 1 ? 's' : ''} found \u00b7 active: ${pc.bold(creds.active_profile)}`,
				);
			}

			const method = await p.select({
				message: 'How would you like to authenticate?',
				options: [
					{
						value: 'browser-auth' as const,
						label: 'Log in via browser',
						hint: 'recommended \u2014 one click',
					},
					{
						value: 'browser-keys' as const,
						label: 'Create API key in browser',
						hint: 'for manual key management',
					},
					{
						value: 'manual' as const,
						label: 'Paste an existing API key',
					},
				],
			});

			if (p.isCancel(method)) {
				cancelAndExit('Login cancelled.');
			}

			if (method === 'browser-auth') {
				const result = await browserAuthFlow(globalOpts);
				if (!result) {
					process.exit(1);
				}
				apiKey = result;
				usedBrowserAuth = true;
			} else {
				if (method === 'browser-keys') {
					process.stderr.write(`\n  ${pc.dim('Opening')} ${pc.cyan(API_KEYS_URL)}\n\n`);
					const keysOpened = await openBrowser(API_KEYS_URL);
					if (!keysOpened) {
						process.stderr.write(`  ${pc.dim('Could not open browser. Visit the URL above.')}\n\n`);
					}
				}

				const keyInput = await p.password({
					message: 'Paste your API key:',
					validate: (value) => {
						if (!value || value.length === 0) {
							return 'API key is required';
						}
						if (!value.startsWith(KEY_PREFIX)) {
							return `Key must start with "${KEY_PREFIX}"`;
						}
						return undefined;
					},
				});

				if (p.isCancel(keyInput)) {
					cancelAndExit('Login cancelled.');
				}

				apiKey = keyInput;
			}
		}

		if (!apiKey.startsWith(KEY_PREFIX)) {
			outputError(
				{
					message: `Invalid key format. Keys start with "${KEY_PREFIX}".`,
					code: 'invalid_key_format',
				},
				{ json: globalOpts.json },
			);
		}

		// Validate key (skip for browser auth — server already validated)
		if (!usedBrowserAuth) {
			const spinner = createSpinner('Validating...', globalOpts.quiet);

			const { valid, error } = await validateApiKey(apiKey);
			if (!valid) {
				spinner.fail('Invalid API key');
				outputError(
					{ message: error || 'API key validation failed.', code: 'invalid_key' },
					{ json: globalOpts.json },
				);
			}

			spinner.stop('Key verified');
		}

		// Profile selection
		let profileName = opts.profile || 'default';

		if (isInteractive() && !globalOpts.json && !opts.key && !opts.tokenStdin) {
			const profiles = listProfiles();

			if (profiles.length > 0) {
				const options: Array<{ value: string; label: string; hint?: string }> = profiles.map(
					(profile) => ({
						value: profile.name,
						label: profile.name,
						hint: profile.active ? 'active \u2014 will overwrite' : 'will overwrite',
					}),
				);

				options.push({
					value: '__new__',
					label: 'Create a new profile',
				});

				const selected = await p.select({
					message: 'Save to which profile?',
					options,
				});

				if (p.isCancel(selected)) {
					cancelAndExit('Login cancelled.');
				}

				if (selected === '__new__') {
					const newName = await p.text({
						message: 'Profile name:',
						placeholder: 'production',
						validate: (value) => {
							if (!value || value.length === 0) {
								return 'Name required';
							}
							if (profiles.find((prof) => prof.name === value)) {
								return `"${value}" already exists`;
							}
							if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
								return 'Letters, numbers, dashes, underscores only';
							}
							return undefined;
						},
					});

					if (p.isCancel(newName)) {
						cancelAndExit('Login cancelled.');
					}

					profileName = newName;
				} else {
					profileName = selected;
				}
			}
		}

		let configPath: string;
		try {
			configPath = storeApiKey(apiKey, profileName);
		} catch (err) {
			outputError(
				{
					message: `Failed to save: ${err instanceof Error ? err.message : 'unknown error'}`,
					code: 'config_write_error',
				},
				{ json: globalOpts.json },
			);
		}

		if (!globalOpts.json && isInteractive()) {
			process.stderr.write('\n');
			process.stderr.write(`  ${pc.green('\u2714')} Authenticated as ${pc.bold(profileName)}\n`);
			process.stderr.write(`  ${pc.dim(`Credentials saved to ${configPath}`)}\n`);
			showPostLoginHelp();
		} else {
			outputResult(
				{
					profile: profileName,
					configPath,
					status: 'authenticated',
				},
				{ json: globalOpts.json },
			);
		}
	});
