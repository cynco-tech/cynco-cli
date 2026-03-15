import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { openBrowser } from '../lib/browser';
import type { GlobalOpts } from '../lib/client';
import { buildHelpText } from '../lib/help-text';
import { outputResult } from '../lib/output';
import { isInteractive } from '../lib/tty';

const DASHBOARD_URL = 'https://app.cynco.io';

const PAGES: Record<string, string> = {
	dashboard: '/',
	invoices: '/invoices',
	customers: '/customers',
	vendors: '/vendors',
	bills: '/bills',
	reports: '/reports',
	settings: '/settings',
	'api-keys': '/settings/api-keys',
};

export const open = new Command('open')
	.description('Open the Cynco dashboard in your browser')
	.argument('[page]', 'Page to open (e.g., invoices, settings, api-keys)')
	.addHelpText(
		'after',
		buildHelpText({
			context: `Available pages: ${Object.keys(PAGES).join(', ')}`,
			examples: ['cynco open', 'cynco open invoices', 'cynco open settings', 'cynco open api-keys'],
		}),
	)
	.action(async (page) => {
		const globalOpts = open.optsWithGlobals() as GlobalOpts;

		const path = page ? PAGES[page] : '/';
		if (page && !path) {
			const available = Object.keys(PAGES).join(', ');
			if (!globalOpts.json && isInteractive()) {
				console.log(`${pc.yellow('Unknown page:')} "${page}". Available: ${available}`);
			} else {
				outputResult(
					{ error: `Unknown page: ${page}`, available: Object.keys(PAGES) },
					{ json: globalOpts.json },
				);
			}
			process.exitCode = 1;
			return;
		}

		const url = `${DASHBOARD_URL}${path}`;

		await openBrowser(url);

		if (!globalOpts.json && isInteractive()) {
			console.log(`Opened ${pc.cyan(pc.underline(url))} in your browser.`);
		} else {
			outputResult({ url, opened: true }, { json: globalOpts.json });
		}
	});
