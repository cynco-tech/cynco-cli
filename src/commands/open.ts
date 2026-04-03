import { Command } from '@commander-js/extra-typings';
import pc from 'picocolors';
import { openBrowser } from '../lib/browser';
import type { GlobalOpts } from '../lib/client';
import { buildHelpText } from '../lib/help-text';
import { outputResult } from '../lib/output';
import { isInteractive } from '../lib/tty';

const DASHBOARD_URL = 'https://app.cynco.io';

const KNOWN_PAGES: Record<string, string> = {
	dashboard: '/',
	invoices: '/invoices',
	customers: '/customers',
	vendors: '/vendors',
	bills: '/bills',
	reports: '/reports',
	settings: '/settings',
	'api-keys': '/settings/api-keys',
	extract: '/extract',
	banking: '/banking',
	accounting: '/accounting',
};

export const open = new Command('open')
	.description('Open the Cynco dashboard in your browser')
	.argument('[page]', 'Page to open (e.g., invoices, settings) — any path accepted')
	.addHelpText(
		'after',
		buildHelpText({
			context: `Known shortcuts: ${Object.keys(KNOWN_PAGES).join(', ')}\n  Any other value is used as a path: cynco open /my/custom/page`,
			examples: [
				'cynco open',
				'cynco open invoices',
				'cynco open settings',
				'cynco open /dashboard/banking/fac_abc123',
			],
		}),
	)
	.action(async (page) => {
		const globalOpts = open.optsWithGlobals() as GlobalOpts;

		let path: string;
		if (!page) {
			path = '/';
		} else if (KNOWN_PAGES[page]) {
			path = KNOWN_PAGES[page];
		} else {
			// Accept any path — prefix with / if missing
			path = page.startsWith('/') ? page : `/${page}`;
		}

		const url = `${DASHBOARD_URL}${path}`;

		await openBrowser(url);

		if (!globalOpts.json && isInteractive()) {
			console.log(`Opened ${pc.cyan(pc.underline(url))} in your browser.`);
		} else {
			outputResult({ url, opened: true }, { json: globalOpts.json });
		}
	});
