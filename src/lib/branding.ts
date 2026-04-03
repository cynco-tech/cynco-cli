import pc from 'picocolors';
import { resolveApiKey, resolveProfileName } from './config';
import { isInteractive, isUnicodeSupported } from './tty';
import { VERSION } from './version';

const LOGO = `
   ██████╗██╗   ██╗███╗   ██╗ ██████╗ ██████╗
  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝██╔═══██╗
  ██║      ╚████╔╝ ██╔██╗ ██║██║     ██║   ██║
  ██║       ╚██╔╝  ██║╚██╗██║██║     ██║   ██║
  ╚██████╗   ██║   ██║ ╚████║╚██████╗╚██████╔╝
   ╚═════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝`;

/**
 * Returns the branded startup text shown when running bare `cynco`.
 * Includes ASCII logo, session info, and quick-start hints.
 * Returns empty string in non-interactive mode.
 */
export function getBrandingText(): string {
	if (!isInteractive()) return '';

	const lines: string[] = [];

	// Logo
	if (isUnicodeSupported) {
		lines.push(LOGO);
	} else {
		lines.push(`\n  CYNCO`);
	}

	lines.push('');

	// Session bar: version · profile · key status
	const parts: string[] = [`v${VERSION}`];

	const profileName = resolveProfileName();
	parts.push(profileName);

	try {
		const resolved = resolveApiKey();
		if (resolved) {
			const masked = maskKeyShort(resolved.key);
			parts.push(masked);
		} else {
			parts.push(pc.dim('not authenticated'));
		}
	} catch {
		parts.push(pc.dim('not authenticated'));
	}

	lines.push(`  ${pc.dim(parts.join('  \u00b7  '))}`);
	lines.push('');

	return lines.join('\n');
}

/**
 * Returns quick-start commands or first-run welcome shown below branding.
 */
export function getQuickStart(): string {
	const isAuthenticated = (() => {
		try {
			return !!resolveApiKey();
		} catch {
			return false;
		}
	})();

	const lines: string[] = [];

	if (!isAuthenticated) {
		// First-run: guide to login
		lines.push(`  ${pc.dim('Welcome! Log in to get started:')}`);
		lines.push('');
		lines.push(`  ${pc.dim('$')} cynco login            ${pc.dim('Authenticate via browser')}`);
		lines.push(`  ${pc.dim('$')} cynco --help           ${pc.dim('All commands')}`);
	} else {
		lines.push(`  ${pc.dim('Quick start:')}`);
		lines.push('');
		lines.push(`  ${pc.dim('$')} cynco status           ${pc.dim('Business health overview')}`);
		lines.push(`  ${pc.dim('$')} cynco invoices list     ${pc.dim('List invoices')}`);
		lines.push(`  ${pc.dim('$')} cynco extract file.pdf  ${pc.dim('AI document extraction')}`);
		lines.push(`  ${pc.dim('$')} cynco --help            ${pc.dim('All commands')}`);
	}

	lines.push('');
	return lines.join('\n');
}

function maskKeyShort(key: string): string {
	if (key.length <= 8) return '***';
	return `${key.slice(0, 4)}***${key.slice(-3)}`;
}
