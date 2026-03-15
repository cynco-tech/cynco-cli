import { isUnicodeSupported } from './tty';

const BOX = isUnicodeSupported
	? {
			h: String.fromCodePoint(0x2500),
			v: String.fromCodePoint(0x2502),
			tl: String.fromCodePoint(0x250c),
			tr: String.fromCodePoint(0x2510),
			bl: String.fromCodePoint(0x2514),
			br: String.fromCodePoint(0x2518),
			lm: String.fromCodePoint(0x251c),
			rm: String.fromCodePoint(0x2524),
			tm: String.fromCodePoint(0x252c),
			bm: String.fromCodePoint(0x2534),
			mm: String.fromCodePoint(0x253c),
		}
	: {
			h: '-',
			v: '|',
			tl: '+',
			tr: '+',
			bl: '+',
			br: '+',
			lm: '+',
			rm: '+',
			tm: '+',
			bm: '+',
			mm: '+',
		};

// NOTE: Column width calculation uses string.length, which does not account for
// double-width characters (CJK, emoji) or zero-width joiners. This is acceptable
// because CLI output currently only contains ASCII text. If we ever display
// user-generated content with wide characters, we should switch to a library
// like string-width for accurate terminal column measurement.
export function renderTable(
	headers: string[],
	rows: string[][],
	emptyMessage = '(no results)',
): string {
	if (rows.length === 0) {
		return emptyMessage;
	}
	const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
	const top = BOX.tl + widths.map((w) => BOX.h.repeat(w + 2)).join(BOX.tm) + BOX.tr;
	const mid = BOX.lm + widths.map((w) => BOX.h.repeat(w + 2)).join(BOX.mm) + BOX.rm;
	const bot = BOX.bl + widths.map((w) => BOX.h.repeat(w + 2)).join(BOX.bm) + BOX.br;
	const row = (cells: string[]) =>
		BOX.v +
		' ' +
		cells.map((c, i) => (c ?? '').padEnd(widths[i] ?? 0)).join(` ${BOX.v} `) +
		' ' +
		BOX.v;
	return [top, row(headers), mid, ...rows.map(row), bot].join('\n');
}
