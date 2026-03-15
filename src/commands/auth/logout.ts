import * as p from '@clack/prompts';
import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../../lib/client';
import { listProfiles, removeAllApiKeys, removeApiKey } from '../../lib/config';
import { buildHelpText } from '../../lib/help-text';
import { errorMessage, outputError, outputResult } from '../../lib/output';
import { cancelAndExit } from '../../lib/prompts';
import { isInteractive } from '../../lib/tty';

export const logout = new Command('logout')
	.description('Log out and remove stored credentials')
	.option('--profile <name>', 'Remove only a specific profile')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: ['cynco auth logout', 'cynco auth logout --profile staging'],
		}),
	)
	.action(async (opts) => {
		const globalOpts = logout.optsWithGlobals() as GlobalOpts;

		if (opts.profile) {
			try {
				const configPath = removeApiKey(opts.profile);
				if (!globalOpts.json && isInteractive()) {
					p.log.success(`Profile ${pc.bold(opts.profile)} removed from ${pc.dim(configPath)}.`);
				} else {
					outputResult(
						{
							profile: opts.profile,
							status: 'removed',
						},
						{ json: globalOpts.json },
					);
				}
			} catch (err) {
				outputError(
					{
						message: errorMessage(err, 'Failed to remove profile'),
						code: 'logout_error',
					},
					{ json: globalOpts.json },
				);
			}
			return;
		}

		const profiles = listProfiles();
		if (profiles.length === 0) {
			if (!globalOpts.json && isInteractive()) {
				p.log.info('No profiles found. Already logged out.');
			} else {
				outputResult({ status: 'already_logged_out' }, { json: globalOpts.json });
			}
			return;
		}

		if (isInteractive() && !globalOpts.json) {
			const confirmed = await p.confirm({
				message: `Remove all ${profiles.length} profile(s)? This cannot be undone.`,
			});

			if (p.isCancel(confirmed) || !confirmed) {
				cancelAndExit('Logout cancelled.');
			}
		}

		try {
			const configPath = removeAllApiKeys();
			if (!globalOpts.json && isInteractive()) {
				p.log.success(`All profiles removed. Credentials deleted from ${pc.dim(configPath)}.`);
			} else {
				outputResult(
					{
						profilesRemoved: profiles.length,
						status: 'logged_out',
					},
					{ json: globalOpts.json },
				);
			}
		} catch (err) {
			outputError(
				{
					message: errorMessage(err, 'Failed to remove credentials'),
					code: 'logout_error',
				},
				{ json: globalOpts.json },
			);
		}
	});
