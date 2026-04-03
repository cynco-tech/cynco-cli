import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../../lib/client';
import { listProfiles, maskKey, readCredentials } from '../../lib/config';
import { buildHelpText } from '../../lib/help-text';
import { outputResult } from '../../lib/output';
import { renderTable } from '../../lib/table';
import { isInteractive } from '../../lib/tty';

export const list = new Command('list')
	.alias('ls')
	.description('List all stored profiles')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: ['cynco auth list', 'cynco auth ls'],
		}),
	)
	.action(() => {
		const globalOpts = list.optsWithGlobals() as GlobalOpts;
		const profiles = listProfiles();
		const creds = readCredentials();

		if (!globalOpts.json && isInteractive()) {
			if (profiles.length === 0) {
				process.stderr.write(`\n  ${pc.dim('No profiles found.')}\n`);
				process.stderr.write(`  ${pc.dim('Run')} cynco login ${pc.dim('to get started.')}\n\n`);
				return;
			}

			const headers = ['Profile', 'API Key', ''];
			const rows = profiles.map((profile) => {
				const key = creds?.profiles[profile.name]?.api_key ?? '';
				const active = profile.active ? pc.green('\u25cf active') : '';
				return [profile.name, pc.dim(maskKey(key)), active];
			});

			process.stderr.write('\n');
			process.stderr.write(`${renderTable(headers, rows)}\n\n`);
		} else {
			outputResult(
				profiles.map((profile) => ({
					name: profile.name,
					active: profile.active,
				})),
				{ json: globalOpts.json },
			);
		}
	});
