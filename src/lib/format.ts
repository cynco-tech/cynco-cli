import pc from 'picocolors';

export function formatMoney(amount?: number | null, currency?: string): string {
	if (amount == null) return '-';
	const formatted = amount.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return currency ? `${currency} ${formatted}` : formatted;
}

type ColorFn = (s: string) => string;

const DEFAULT_STATUS_COLORS: Record<string, ColorFn> = {
	paid: pc.green,
	posted: pc.green,
	reconciled: pc.green,
	approved: pc.cyan,
	verified: pc.cyan,
	finalized: pc.cyan,
	sent: pc.blue,
	categorized: pc.blue,
	overdue: pc.red,
	failed: pc.red,
	cancelled: pc.red,
	reversed: pc.red,
	excluded: pc.red,
	void: pc.gray,
	draft: pc.yellow,
	pending_approval: pc.yellow,
	imported: pc.yellow,
	pending: pc.yellow,
};

export function colorizeStatus(status: string, extraColors?: Record<string, ColorFn>): string {
	const colors = extraColors ? { ...DEFAULT_STATUS_COLORS, ...extraColors } : DEFAULT_STATUS_COLORS;
	const colorFn = colors[status];
	return colorFn ? colorFn(status) : pc.yellow(status);
}

export function statusIndicator(status?: string, extraColors?: Record<string, ColorFn>): string {
	if (!status) return pc.dim('\u2014');
	const lower = status.toLowerCase();
	const colors = extraColors ? { ...DEFAULT_STATUS_COLORS, ...extraColors } : DEFAULT_STATUS_COLORS;
	const colorFn = colors[lower] ?? pc.yellow;
	const dot = lower === 'void' ? '\u25cb' : '\u25cf'; // ○ for void, ● for everything else
	return colorFn(`${dot} ${lower}`);
}

export function formatPercent(rate?: number): string {
	if (rate == null) return '-';
	return `${rate}%`;
}
