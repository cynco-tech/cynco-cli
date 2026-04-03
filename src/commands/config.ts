import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import type { GlobalOpts } from '../lib/client';
import { buildHelpText } from '../lib/help-text';
import { outputError, outputResult } from '../lib/output';
import {
	coerceSettingValue,
	flattenSettings,
	getSetting,
	isValidKey,
	resetSettings,
	setSetting,
	VALID_KEYS,
} from '../lib/settings';
import { isInteractive } from '../lib/tty';

const setCmd = new Command('set')
	.description('Set a configuration value')
	.argument('<key>', 'Setting key (e.g. output.format)')
	.argument('<value>', 'Setting value')
	.addHelpText(
		'after',
		buildHelpText({
			context: `Valid keys: ${VALID_KEYS.join(', ')}`,
			examples: [
				'cynco config set output.format json',
				'cynco config set defaults.currency MYR',
				'cynco config set defaults.limit 50',
				'cynco config set api.timeout 60000',
			],
		}),
	)
	.action((key, value) => {
		const globalOpts = setCmd.optsWithGlobals() as GlobalOpts;

		if (!isValidKey(key)) {
			outputError(
				{
					message: `Unknown setting "${key}". Valid keys: ${VALID_KEYS.join(', ')}`,
					code: 'invalid_key',
				},
				{ json: globalOpts.json },
			);
		}

		const coerced = coerceSettingValue(key, value);
		if (coerced === undefined) {
			outputError(
				{ message: `Invalid value "${value}" for ${key}`, code: 'invalid_value' },
				{ json: globalOpts.json },
			);
		}

		setSetting(key, coerced);

		if (!globalOpts.json && isInteractive()) {
			process.stderr.write(`  ${pc.green('\u2714')} ${key} = ${String(coerced)}\n`);
		} else {
			outputResult({ key, value: coerced }, { json: globalOpts.json });
		}
	});

const getCmd = new Command('get')
	.description('Get a configuration value')
	.argument('<key>', 'Setting key (e.g. output.format)')
	.action((key) => {
		const globalOpts = getCmd.optsWithGlobals() as GlobalOpts;
		const value = getSetting(key);

		if (!globalOpts.json && isInteractive()) {
			if (value === undefined) {
				process.stderr.write(`  ${pc.dim(key)}: ${pc.dim('(not set)')}\n`);
			} else {
				process.stderr.write(`  ${key}: ${String(value)}\n`);
			}
		} else {
			outputResult({ key, value: value ?? null }, { json: globalOpts.json });
		}
	});

const listCmd = new Command('list')
	.description('List all configuration values')
	.action((_opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		const entries = flattenSettings();

		if (!globalOpts.json && isInteractive()) {
			if (entries.length === 0) {
				process.stderr.write(
					`  ${pc.dim('No settings configured. Use: cynco config set <key> <value>')}\n`,
				);
			} else {
				for (const { key, value } of entries) {
					process.stderr.write(`  ${pc.dim(key)}: ${value}\n`);
				}
			}
		} else {
			outputResult(Object.fromEntries(entries.map(({ key, value }) => [key, value])), {
				json: globalOpts.json,
			});
		}
	});

const resetCmd = new Command('reset')
	.description('Reset all settings to defaults')
	.action((_opts, cmd) => {
		const globalOpts = cmd.optsWithGlobals() as GlobalOpts;
		resetSettings();

		if (!globalOpts.json && isInteractive()) {
			process.stderr.write(`  ${pc.green('\u2714')} Settings reset to defaults\n`);
		} else {
			outputResult({ reset: true }, { json: globalOpts.json });
		}
	});

export const configCmd = new Command('config')
	.description('Manage CLI settings')
	.addCommand(setCmd)
	.addCommand(getCmd)
	.addCommand(listCmd, { isDefault: true })
	.addCommand(resetCmd);
