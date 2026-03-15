import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { CyncoClient, type GlobalOpts } from '../lib/client';
import { resolveApiKey, resolveProfileName } from '../lib/config';
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

async function checkApiValidation(profileFlag?: string, apiKeyFlag?: string): Promise<CheckResult> {
	const resolved = resolveApiKey(apiKeyFlag, profileFlag);

	if (!resolved) {
		return {
			name: 'API validation',
			status: 'fail',
			message: 'Skipped (no API key)',
		};
	}

	try {
		const client = new CyncoClient(resolved.key);
		const result = await client.get<unknown>('/accounts');

		if (result.error) {
			return {
				name: 'API validation',
				status: 'fail',
				message: `API returned error: ${result.error.message}`,
			};
		}

		return {
			name: 'API validation',
			status: 'pass',
			message: 'API key is valid',
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Connection failed';
		return {
			name: 'API validation',
			status: 'fail',
			message: `Could not reach API: ${msg}`,
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

		const [versionResult, apiKeyResult, apiResult] = await Promise.all([
			checkCliVersion(),
			Promise.resolve(checkApiKeyPresence(globalOpts.profile, globalOpts.apiKey)),
			checkApiValidation(globalOpts.profile, globalOpts.apiKey),
		]);

		const results: CheckResult[] = [versionResult, apiKeyResult, apiResult];

		if (!globalOpts.json && isInteractive()) {
			console.log('');
			console.log(pc.bold('Cynco CLI Doctor'));
			console.log('');

			for (const result of results) {
				console.log(`  ${statusIcon(result.status)} ${pc.bold(result.name)}: ${result.message}`);
			}

			console.log('');

			const hasFailure = results.some((r) => r.status === 'fail');
			if (hasFailure) {
				console.log(pc.red('Some checks failed. See above for details.'));
				process.exitCode = 1;
			} else {
				console.log(pc.green('All checks passed.'));
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
