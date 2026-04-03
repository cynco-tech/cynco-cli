import { statSync } from 'node:fs';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { API_VERSION, CyncoClient, type GlobalOpts } from '../lib/client';
import { getConfigDir, resolveApiKey, resolveProfileName } from '../lib/config';
import { buildHelpText } from '../lib/help-text';
import { outputResult } from '../lib/output';
import { CROSS, isInteractive, TICK, WARN } from '../lib/tty';
import { fetchLatestVersion, isNewer } from '../lib/update-check';
import { VERSION } from '../lib/version';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckResult {
	name: string;
	status: CheckStatus;
	message: string;
}

function statusIcon(status: CheckStatus): string {
	switch (status) {
		case 'pass':
			return pc.green(TICK);
		case 'warn':
			return pc.yellow(WARN);
		case 'fail':
			return pc.red(CROSS);
	}
}

async function checkCliVersion(): Promise<CheckResult> {
	const latest = await fetchLatestVersion();

	if (!latest) {
		return {
			name: 'CLI version',
			status: 'warn',
			message: `v${VERSION} (could not check for updates)`,
		};
	}

	if (isNewer(VERSION, latest)) {
		return {
			name: 'CLI version',
			status: 'warn',
			message: `v${VERSION} (update available: v${latest})`,
		};
	}

	return {
		name: 'CLI version',
		status: 'pass',
		message: `v${VERSION} (up to date)`,
	};
}

function checkApiKeyPresence(profileFlag?: string, apiKeyFlag?: string): CheckResult {
	const resolved = resolveApiKey(apiKeyFlag, profileFlag);

	if (!resolved) {
		return {
			name: 'API key',
			status: 'fail',
			message: 'No API key found. Run: cynco login',
		};
	}

	const profile = resolveProfileName(profileFlag);
	const sourceLabel =
		resolved.source === 'flag'
			? '--api-key flag'
			: resolved.source === 'env'
				? 'CYNCO_API_KEY env var'
				: `profile "${profile}"`;

	return {
		name: 'API key',
		status: 'pass',
		message: `Found via ${sourceLabel}`,
	};
}

function checkNodeVersion(): CheckResult {
	const current = process.version.replace(/^v/, '');
	const major = parseInt(current.split('.')[0] ?? '0', 10);

	if (major >= 20) {
		return {
			name: 'Node.js',
			status: 'pass',
			message: `v${current} (>= 20 required)`,
		};
	}

	return {
		name: 'Node.js',
		status: 'warn',
		message: `v${current} (>= 20 recommended)`,
	};
}

function checkConfigPermissions(): CheckResult {
	if (process.platform === 'win32') {
		return { name: 'Config permissions', status: 'pass', message: 'Skipped on Windows' };
	}

	const configPath = `${getConfigDir()}/credentials.json`;
	try {
		const stat = statSync(configPath);
		const mode = (stat.mode & 0o777).toString(8);
		if (mode === '600') {
			return { name: 'Config permissions', status: 'pass', message: `${configPath} (0600)` };
		}
		return {
			name: 'Config permissions',
			status: 'warn',
			message: `${configPath} has mode 0${mode} (expected 0600)`,
		};
	} catch {
		return { name: 'Config permissions', status: 'pass', message: 'No credentials file yet' };
	}
}

interface ApiCheckResult {
	validation: CheckResult;
	latency: CheckResult;
	apiVersion: CheckResult;
}

async function checkApi(profileFlag?: string, apiKeyFlag?: string): Promise<ApiCheckResult> {
	const resolved = resolveApiKey(apiKeyFlag, profileFlag);
	const skipped: ApiCheckResult = {
		validation: { name: 'API validation', status: 'fail', message: 'Skipped (no API key)' },
		latency: { name: 'API latency', status: 'fail', message: 'Skipped (no API key)' },
		apiVersion: {
			name: 'API version',
			status: 'pass',
			message: `CLI sends: ${API_VERSION}`,
		},
	};

	if (!resolved) return skipped;

	const start = Date.now();
	try {
		const client = new CyncoClient(resolved.key);
		const result = await client.get<unknown>('/accounts');
		const ms = Date.now() - start;

		const latencyStatus: CheckStatus = ms > 5000 ? 'fail' : ms > 2000 ? 'warn' : 'pass';

		if (result.error) {
			return {
				validation: {
					name: 'API validation',
					status: 'fail',
					message: `API returned error: ${result.error.message}`,
				},
				latency: { name: 'API latency', status: latencyStatus, message: `${ms}ms` },
				apiVersion: {
					name: 'API version',
					status: 'pass',
					message: `CLI sends: ${API_VERSION}`,
				},
			};
		}

		return {
			validation: { name: 'API validation', status: 'pass', message: 'API key is valid' },
			latency: { name: 'API latency', status: latencyStatus, message: `${ms}ms` },
			apiVersion: {
				name: 'API version',
				status: 'pass',
				message: `CLI sends: ${API_VERSION}`,
			},
		};
	} catch (err) {
		const ms = Date.now() - start;
		const msg = err instanceof Error ? err.message : 'Connection failed';
		return {
			validation: {
				name: 'API validation',
				status: 'fail',
				message: `Could not reach API: ${msg}`,
			},
			latency: { name: 'API latency', status: 'fail', message: `${ms}ms (failed)` },
			apiVersion: {
				name: 'API version',
				status: 'pass',
				message: `CLI sends: ${API_VERSION}`,
			},
		};
	}
}

export const doctor = new Command('doctor')
	.description('Check CLI configuration and connectivity')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco doctor', 'cynco doctor --json'],
		}),
	)
	.action(async () => {
		const globalOpts = doctor.optsWithGlobals() as GlobalOpts;

		const [versionResult, apiKeyResult, apiChecks] = await Promise.all([
			checkCliVersion(),
			Promise.resolve(checkApiKeyPresence(globalOpts.profile, globalOpts.apiKey)),
			checkApi(globalOpts.profile, globalOpts.apiKey),
		]);

		const results: CheckResult[] = [
			checkNodeVersion(),
			versionResult,
			apiKeyResult,
			checkConfigPermissions(),
			apiChecks.validation,
			apiChecks.latency,
			apiChecks.apiVersion,
		];

		if (!globalOpts.json && isInteractive()) {
			const w = (s: string) => process.stderr.write(`${s}\n`);
			const maxName = Math.max(...results.map((r) => r.name.length));

			w('');
			w(`  ${pc.bold('Cynco CLI Doctor')}`);
			w('');

			for (const result of results) {
				const label = pc.dim(result.name.padEnd(maxName));
				w(`  ${statusIcon(result.status)} ${label}  ${result.message}`);
			}

			w('');

			const hasFailure = results.some((r) => r.status === 'fail');
			if (hasFailure) {
				w(`  ${pc.red('Some checks failed. See above for details.')}`);
				process.exitCode = 1;
			} else {
				w(`  ${pc.green('All checks passed.')}`);
			}
		} else {
			const hasFailure = results.some((r) => r.status === 'fail');
			outputResult(
				{
					checks: results.map((r) => ({
						name: r.name,
						status: r.status,
						message: r.message,
					})),
					healthy: !hasFailure,
				},
				{ json: globalOpts.json },
			);
			if (hasFailure) {
				process.exitCode = 1;
			}
		}
	});
