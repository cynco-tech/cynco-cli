import * as p from '@clack/prompts';
import { Command } from '@commander-js/extra-typings';
import type { GlobalOpts } from '../../lib/client';
import { listProfiles, renameProfile, validateProfileName } from '../../lib/config';
import { errorMessage, outputError, outputResult } from '../../lib/output';
import { cancelAndExit } from '../../lib/prompts';
import { isInteractive } from '../../lib/tty';

export const rename = new Command('rename')
	.description('Rename a stored profile')
	.argument('[old-name]', 'Current profile name')
	.argument('[new-name]', 'New profile name')
	.addHelpText('after', '\nExamples:\n  cynco auth rename\n  cynco auth rename default production')
	.action(async (oldName, newName, _opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;

		let from = oldName;
		let to = newName;

		if (!from) {
			if (!isInteractive()) {
				outputError(
					{
						message:
							'Profile name is required in non-interactive mode. Usage: cynco auth rename <old-name> <new-name>',
						code: 'missing_old_name',
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

			const options = profiles.map((profile) => ({
				value: profile.name,
				label: profile.name,
				hint: profile.active ? 'active' : undefined,
			}));

			const selected = await p.select({
				message: 'Select a profile to rename:',
				options,
			});

			if (p.isCancel(selected)) {
				cancelAndExit('Rename cancelled.');
			}

			from = selected;
		}

		if (!to) {
			if (!isInteractive()) {
				outputError(
					{
						message:
							'New profile name is required in non-interactive mode. Usage: cynco auth rename <old-name> <new-name>',
						code: 'missing_new_name',
					},
					{ json: globalOpts.json },
				);
			}

			const newNameInput = await p.text({
				message: `New name for "${from}":`,
				placeholder: from,
				validate: (value) => validateProfileName(value as string),
			});

			if (p.isCancel(newNameInput)) {
				cancelAndExit('Rename cancelled.');
			}

			to = newNameInput;
		}

		try {
			renameProfile(from, to);

			if (!globalOpts.json && isInteractive()) {
				p.log.success(`Profile "${from}" renamed to "${to}".`);
			} else {
				outputResult({ success: true, old_name: from, new_name: to }, { json: globalOpts.json });
			}
		} catch (err) {
			outputError(
				{
					message: errorMessage(err, 'Failed to rename profile'),
					code: 'rename_error',
				},
				{ json: globalOpts.json },
			);
		}
	});
