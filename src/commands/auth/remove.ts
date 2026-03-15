import * as p from '@clack/prompts';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../../lib/client';
import { removeApiKey } from '../../lib/config';
import { buildHelpText } from '../../lib/help-text';
import { errorMessage, outputError, outputResult } from '../../lib/output';
import { cancelAndExit } from '../../lib/prompts';
import { isInteractive } from '../../lib/tty';

export const remove = new Command('remove')
	.alias('rm')
	.description('Remove a stored profile')
	.argument('<profile>', 'Profile name to remove')
	.option('-y, --yes', 'Skip confirmation prompt')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: ['cynco auth remove staging', 'cynco auth rm staging --yes'],
		}),
	)
	.action(async (profileName, opts) => {
		const globalOpts = remove.optsWithGlobals() as GlobalOpts;

		if (!opts.yes) {
			if (!isInteractive()) {
				outputError(
					{
						message: 'Use --yes to confirm removal in non-interactive mode.',
						code: 'confirmation_required',
					},
					{ json: globalOpts.json },
				);
			}

			const confirmed = await p.confirm({
				message: `Remove profile "${profileName}"?`,
			});

			if (p.isCancel(confirmed) || !confirmed) {
				cancelAndExit('Removal cancelled.');
			}
		}

		try {
			removeApiKey(profileName);

			if (!globalOpts.json && isInteractive()) {
				console.log(`Profile ${pc.bold(profileName)} removed.`);
			} else {
				outputResult({ profile: profileName, status: 'removed' }, { json: globalOpts.json });
			}
		} catch (err) {
			outputError(
				{
					message: errorMessage(err, 'Failed to remove profile'),
					code: 'remove_error',
				},
				{ json: globalOpts.json },
			);
		}
	});
