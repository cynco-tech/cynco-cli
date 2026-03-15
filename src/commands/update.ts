import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import { buildHelpText } from '../lib/help-text';
import { outputResult } from '../lib/output';
import { isInteractive } from '../lib/tty';
import { detectInstallMethod, fetchLatestVersion, isNewer } from '../lib/update-check';
import { VERSION } from '../lib/version';

export const update = new Command('update')
	.description('Check for CLI updates')
	.addHelpText(
		'after',
		buildHelpText({
			examples: ['cynco update', 'cynco update --json'],
		}),
	)
	.action(async () => {
		const globalOpts = update.optsWithGlobals() as GlobalOpts;

		if (!globalOpts.json && isInteractive()) {
			console.log(`Current version: ${pc.cyan(`v${VERSION}`)}`);
			console.log('Checking for updates...');
		}

		const latest = await fetchLatestVersion();

		if (!latest) {
			if (!globalOpts.json && isInteractive()) {
				console.log(pc.yellow('Could not check for updates. Try again later.'));
			} else {
				outputResult(
					{
						currentVersion: VERSION,
						latestVersion: null,
						updateAvailable: false,
						error: 'Could not fetch latest version',
					},
					{ json: globalOpts.json },
				);
			}
			return;
		}

		const updateAvailable = isNewer(VERSION, latest);

		if (!globalOpts.json && isInteractive()) {
			if (updateAvailable) {
				const upgrade = detectInstallMethod();
				console.log('');
				console.log(
					`Update available: ${pc.yellow(`v${VERSION}`)} ${pc.dim('->')} ${pc.green(`v${latest}`)}`,
				);
				console.log(`Run: ${pc.cyan(upgrade)}`);
			} else {
				console.log(pc.green(`You're on the latest version (v${VERSION}).`));
			}
		} else {
			outputResult(
				{
					currentVersion: VERSION,
					latestVersion: latest,
					updateAvailable,
					...(updateAvailable ? { upgradeCommand: detectInstallMethod() } : {}),
				},
				{ json: globalOpts.json },
			);
		}
	});
