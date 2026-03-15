import * as p from '@clack/prompts';
import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { listProfiles, setActiveProfile, validateProfileName } from '../../lib/config';
import { errorMessage, outputError, outputResult } from '../../lib/output';
import { cancelAndExit, promptRenameIfInvalid } from '../../lib/prompts';
import { isInteractive } from '../../lib/tty';

export const switchProfile = new Command('switch')
	.description('Switch the active profile')
	.argument('[name]', 'Profile name to switch to')
	.addHelpText(
		'after',
		'\nExamples:\n  cynco auth switch\n  cynco auth switch production\n  cynco auth switch staging',
	)
	.action(async (name, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let profileName = name;

		if (!profileName) {
			if (!isInteractive()) {
				outputError(
					{
						message:
							'Profile name is required in non-interactive mode. Usage: cynco auth switch <name>',
						code: 'missing_name',
					},
					{ json: globalOpts.json },
				);
			}

			const profiles = listProfiles();
			if (profiles.length === 0) {
				outputError(
					{
						message: 'No profiles found. Run: cynco login',
						code: 'no_profiles',
					},
					{ json: globalOpts.json },
				);
			}

			const options = profiles.map((profile) => {
				const validationError = validateProfileName(profile.name);
				const hint = profile.active ? 'active' : validationError ? 'invalid name' : undefined;
				return {
					value: profile.name,
					label: profile.name,
					hint,
				};
			});

			const selected = await p.select({
				message: 'Select a profile to switch to:',
				options,
			});

			if (p.isCancel(selected)) {
				cancelAndExit('Switch cancelled.');
			}

			profileName = selected;
		}

		const renamed = await promptRenameIfInvalid(profileName, globalOpts);
		if (renamed && renamed !== profileName) {
			profileName = renamed;
		}

		try {
			setActiveProfile(profileName);

			if (!globalOpts.json && isInteractive()) {
				p.log.success(`Switched active profile to "${profileName}".`);
			} else {
				outputResult({ success: true, active_profile: profileName }, { json: globalOpts.json });
			}
		} catch (err) {
			outputError(
				{
					message: errorMessage(err, 'Failed to switch profile'),
					code: 'switch_error',
				},
				{ json: globalOpts.json },
			);
		}
	});
