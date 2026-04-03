import type { Command } from '@commander-js/extra-typings';

export type McpToolDef = {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, { type: string; description?: string; enum?: string[] }>;
		required: string[];
	};
	/** The argv fragments to construct a Commander parse call */
	commandPath: string[];
	/** Names of positional arguments (not flags) */
	argNames: string[];
};

/**
 * Walks the Commander command tree and auto-generates MCP tool definitions.
 * Each leaf command (one with an action) becomes an MCP tool.
 */
export function generateToolDefs(program: Command): McpToolDef[] {
	const tools: McpToolDef[] = [];
	walkCommands(program, [], tools);
	return tools;
}

function walkCommands(cmd: Command, path: string[], tools: McpToolDef[]): void {
	const commands = (cmd as unknown as { commands: Command[] }).commands ?? [];

	for (const sub of commands) {
		const subName = sub.name();
		const subPath = [...path, subName];

		// Check if this is a leaf command (has an action handler)
		const hasAction = (sub as unknown as { _actionHandler: unknown })._actionHandler != null;
		const hasSubcommands = ((sub as unknown as { commands: Command[] }).commands ?? []).length > 0;

		if (hasAction && !hasSubcommands) {
			// Leaf command — generate a tool
			const tool = buildToolDef(sub, subPath);
			if (tool) tools.push(tool);
		}

		// Recurse into subcommands
		if (hasSubcommands) {
			walkCommands(sub, subPath, tools);
		}
	}
}

function buildToolDef(cmd: Command, path: string[]): McpToolDef | null {
	const desc = cmd.description();
	if (!desc) return null;

	const toolName = path.join('_').replace(/-/g, '_');
	const properties: McpToolDef['inputSchema']['properties'] = {};
	const required: string[] = [];

	// Extract arguments
	const argNames: string[] = [];
	const args =
		(
			cmd as unknown as {
				registeredArguments: Array<{ _name: string; description: string; required: boolean }>;
			}
		).registeredArguments ?? [];
	for (const arg of args) {
		const argName = arg._name;
		argNames.push(argName);
		properties[argName] = {
			type: 'string',
			description: arg.description || argName,
		};
		if (arg.required) {
			required.push(argName);
		}
	}

	// Extract options
	const options = cmd.options ?? [];
	for (const opt of options) {
		if (opt.long === '--help' || opt.long === '--version') continue;
		// Skip global flags — they're handled by the MCP server itself
		if (
			[
				'--json',
				'--quiet',
				'--agent',
				'--verbose',
				'--api-key',
				'--profile',
				'--output',
				'--dry-run',
			].includes(opt.long ?? '')
		)
			continue;

		const flagName = (opt.long ?? opt.short ?? '')
			.replace(/^--?/, '')
			.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

		if (!flagName) continue;

		properties[flagName] = {
			type: opt.isBoolean?.() ? 'boolean' : 'string',
			description: opt.description ?? flagName,
		};

		if (opt.required) {
			required.push(flagName);
		}
	}

	return {
		name: toolName,
		description: `${path.join(' ')}: ${desc}`,
		inputSchema: {
			type: 'object',
			properties,
			required,
		},
		commandPath: path,
		argNames,
	};
}

/**
 * Converts a tool call's input parameters into Commander-compatible argv.
 */
export function buildArgv(toolDef: McpToolDef, params: Record<string, unknown>): string[] {
	const argv: string[] = ['node', 'cynco', ...toolDef.commandPath];

	// Extract argument values first (positional args in order)
	const argNames = new Set(toolDef.argNames);

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) continue;

		// Check if this looks like a positional argument (lowercase, no camelCase = likely an arg)
		// We use a heuristic: if the key matches an argument name from the schema
		const isArg = argNames.has(key);
		if (isArg) {
			argv.push(String(value));
			continue;
		}

		// Convert camelCase back to --kebab-case
		const flag = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

		if (typeof value === 'boolean') {
			if (value) argv.push(flag);
		} else {
			argv.push(flag, String(value));
		}
	}

	// Force agent mode
	argv.push('--agent');

	return argv;
}
