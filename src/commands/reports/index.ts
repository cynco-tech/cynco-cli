import { Command } from '@commander-js/extra-typings';
import { generateReportCmd } from './generate';

export const reportsCmd = new Command('reports')
	.description('Generate financial reports')
	.addCommand(generateReportCmd, { isDefault: true });
