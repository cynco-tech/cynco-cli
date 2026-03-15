import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import {
	getConfigDir,
	maskKey,
	readCredentials,
	resolveApiKey,
	resolveProfileName,
} from '../lib/config';
import { buildHelpText } from '../lib/help-text';
import { outputResult } from '../lib/output';
import { isInteractive } from '../lib/tty';

export const whoami = new Command('whoami')
	.description('Show current authentication status')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: ['cynco whoami', 'cynco whoami --json'],
		}),
	)
	.action(() => {
		const globalOpts = whoami.optsWithGlobals() as GlobalOpts;

		const resolved = resolveApiKey(globalOpts.apiKey, globalOpts.profile);
		const profileName = resolveProfileName(globalOpts.profile);
		const creds = readCredentials();
		const configDir = getConfigDir();

		if (!resolved) {
			if (!globalOpts.json && isInteractive()) {
				console.log(pc.yellow('Not authenticated.'));
				console.log(`Run ${pc.cyan('cynco login')} to get started.`);
			} else {
				outputResult({ authenticated: false }, { json: globalOpts.json });
			}
			process.exitCode = 1;
			return;
		}

		if (!globalOpts.json && isInteractive()) {
			console.log(`${pc.bold('Profile:')}   ${profileName}`);
			console.log(`${pc.bold('API Key:')}   ${maskKey(resolved.key)}`);
			console.log(`${pc.bold('Source:')}    ${resolved.source}`);
			console.log(`${pc.bold('Config:')}    ${configDir}`);

			if (creds) {
				const profileCount = Object.keys(creds.profiles).length;
				console.log(`${pc.bold('Profiles:')}  ${profileCount} stored`);
			}
		} else {
			outputResult(
				{
					authenticated: true,
					profile: profileName,
					source: resolved.source,
					apiKey: maskKey(resolved.key),
					configDir,
					profileCount: creds ? Object.keys(creds.profiles).length : 0,
				},
				{ json: globalOpts.json },
			);
		}
	});
