import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../../lib/help-text';
import { list } from './list';
import { login } from './login';
import { logout } from './logout';
import { remove } from './remove';
import { rename } from './rename';
import { switchProfile } from './switch';

export const auth = new Command('auth')
	.description('Manage authentication profiles')
	.addHelpText(
		'after',
		buildHelpText({
			setup: true,
			examples: [
				'cynco auth login',
				'cynco auth list',
				'cynco auth switch production',
				'cynco auth logout',
			],
		}),
	)
	.addCommand(login)
	.addCommand(logout)
	.addCommand(list, { isDefault: true })
	.addCommand(switchProfile)
	.addCommand(remove)
	.addCommand(rename);
