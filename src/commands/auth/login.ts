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
import { isInteractive } from '../../lib/tty';

const API_KEYS_URL = 'https://app.cynco.io/settings/api-keys';
const KEY_PREFIX = 'cak_';
const POLL_INTERVAL = 2000;
const MAX_POLLS = 150; // 5 minutes

function getBaseUrl(): string {
	return process.env.CYNCO_API_URL || DEFAULT_BASE_URL;
}

async function browserAuthFlow(globalOpts: GlobalOpts): Promise<string | null> {
	const baseUrl = getBaseUrl();

	const startSpinner = createSpinner('Starting browser authentication...', globalOpts.quiet);

	let sessionId: string;
	let deviceCode: string;
	let verificationUri: string;

	try {
		const res = await fetch(`${baseUrl}/api/cli/auth/start`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			signal: AbortSignal.timeout(10000),
		});
		const data = (await res.json()) as {
			success: boolean;
			data?: { sessionId: string; deviceCode: string; verificationUri: string };
			error?: { message: string };
		};

		if (!data.success || !data.data) {
			startSpinner.fail('Failed to start browser auth');
			p.log.error(data.error?.message || 'Could not create auth session');
			return null;
		}

		sessionId = data.data.sessionId;
		deviceCode = data.data.deviceCode;
		verificationUri = data.data.verificationUri;
		startSpinner.stop('Auth session created');
	} catch {
		startSpinner.fail('Could not reach Cynco server');
		p.log.error(`Make sure ${baseUrl} is reachable.`);
		return null;
	}

	p.log.info(`Your verification code: ${pc.bold(pc.cyan(deviceCode))}`);
	p.log.info('Verify this code matches what you see in the browser.');
	p.log.info('');

	const browserUrl = `${verificationUri}?code=${deviceCode}`;
	const opened = await openBrowser(browserUrl);
	if (!opened) {
		p.log.warn(`Could not open browser automatically. Please visit this URL:`);
		p.log.info(pc.cyan(pc.underline(browserUrl)));
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
				pollSpinner.stop('Authorization received!');
				return data.data.apiKey;
			}

			if (data.success && data.data?.status === 'pending') {
				continue;
			}

			// Error states
			if (!data.success) {
				const code = data.error?.code;
				if (code === 'SESSION_EXPIRED') {
					pollSpinner.fail('Session expired');
					p.log.error('The auth session expired. Run `cynco login` again.');
					return null;
				}
				if (code === 'SESSION_CONSUMED') {
					pollSpinner.fail('Session already used');
					p.log.error('This session was already consumed. Run `cynco login` again.');
					return null;
				}
			}
		} catch {}
	}

	pollSpinner.fail('Timed out');
	p.log.error('Browser authorization timed out after 5 minutes. Run `cynco login` again.');
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

export const login = new Command('login')
	.description('Log in to your Cynco account')
	.option('-k, --key <key>', 'API key (skips interactive prompt)')
	.option('--profile <name>', 'Profile name to store the key under', 'default')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: [
				'cynco login',
				'cynco login --key cak_1234567890',
				'cynco login --key cak_1234567890 --profile production',
			],
		}),
	)
	.action(async (opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		let apiKey = opts.key;
		let usedBrowserAuth = false;

		if (!apiKey) {
			if (!isInteractive() || globalOpts.json) {
				outputError(
					{
						message:
							'No API key provided. Use --key in non-interactive mode, or when using --json.',
						code: 'missing_key',
					},
					{ json: globalOpts.json },
				);
			}

			p.intro(pc.bold('Cynco Authentication'));

			// Check for existing credentials and inform the user
			const creds = readCredentials();
			if (creds && Object.keys(creds.profiles).length > 0) {
				const profileCount = Object.keys(creds.profiles).length;
				p.log.info(
					`Found ${profileCount} existing profile(s). Active: ${pc.bold(creds.active_profile)}`,
				);
			}

			const method = await p.select({
				message: 'How would you like to authenticate?',
				options: [
					{
						value: 'browser-auth' as const,
						label: 'Log in via browser',
						hint: 'recommended — one click',
					},
					{
						value: 'browser-keys' as const,
						label: 'Open API keys page in browser',
					},
					{
						value: 'manual' as const,
						label: 'Enter API key manually',
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
					p.log.info(`Opening ${pc.cyan(pc.underline(API_KEYS_URL))} in your browser...`);
					const keysOpened = await openBrowser(API_KEYS_URL);
					if (!keysOpened) {
						p.log.warn(`Could not open browser. Visit: ${pc.cyan(pc.underline(API_KEYS_URL))}`);
					}
				}

				const keyInput = await p.password({
					message: 'Paste your API key:',
					validate: (value) => {
						if (!value || value.length === 0) {
							return 'API key is required';
						}
						if (!value.startsWith(KEY_PREFIX)) {
							return `API key must start with "${KEY_PREFIX}"`;
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
					message: `Invalid API key format. Keys must start with "${KEY_PREFIX}".`,
					code: 'invalid_key_format',
				},
				{ json: globalOpts.json },
			);
		}

		// Skip validation for browser auth — the server already created and validated the key
		if (!usedBrowserAuth) {
			const spinner = createSpinner('Validating API key...', globalOpts.quiet);

			const { valid, error } = await validateApiKey(apiKey);
			if (!valid) {
				spinner.fail('Invalid API key');
				outputError(
					{
						message: error || 'API key validation failed.',
						code: 'invalid_key',
					},
					{ json: globalOpts.json },
				);
			}

			spinner.stop('API key is valid');
		}

		// Determine profile name
		let profileName = opts.profile || 'default';

		// In interactive mode, let the user choose where to store the key
		if (isInteractive() && !globalOpts.json && !opts.key) {
			const profiles = listProfiles();

			if (profiles.length > 0) {
				const options: Array<{ value: string; label: string; hint?: string }> = profiles.map(
					(profile) => ({
						value: profile.name,
						label: profile.name,
						hint: profile.active ? 'active - will overwrite' : 'will overwrite',
					}),
				);

				options.push({
					value: '__new__',
					label: 'Create a new profile',
				});

				const selected = await p.select({
					message: 'Store API key in which profile?',
					options,
				});

				if (p.isCancel(selected)) {
					cancelAndExit('Login cancelled.');
				}

				if (selected === '__new__') {
					const newName = await p.text({
						message: 'New profile name:',
						placeholder: 'production',
						validate: (value) => {
							if (!value || value.length === 0) {
								return 'Profile name is required';
							}
							const existing = profiles.find((prof) => prof.name === value);
							if (existing) {
								return `Profile "${value}" already exists`;
							}
							if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
								return 'Profile name must contain only letters, numbers, dashes, and underscores';
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
					message: `Failed to save credentials: ${err instanceof Error ? err.message : 'unknown error'}`,
					code: 'config_write_error',
				},
				{ json: globalOpts.json },
			);
		}

		if (!globalOpts.json && isInteractive()) {
			p.log.success(
				`Logged in as profile ${pc.bold(profileName)}. Credentials saved to ${pc.dim(configPath)}`,
			);
			p.outro(pc.green('Ready to use Cynco CLI.'));
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
