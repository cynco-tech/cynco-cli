import { Command } from '@commander-js/extra-typings';
import { buildHelpText } from '../lib/help-text';

const serveCmd = new Command('serve')
	.description('Start the MCP server over stdio')
	.addHelpText(
		'after',
		buildHelpText({
			context:
				'Exposes all CLI commands as MCP tools for AI agents.\n' +
				'  Uses stdio transport — designed for Claude Desktop, Cursor, and other MCP clients.\n' +
				'  Each CLI command is auto-discovered and registered as a tool.',
			examples: [
				'cynco mcp serve',
				'# In Claude Desktop config:',
				'# { "mcpServers": { "cynco": { "command": "cynco", "args": ["mcp", "serve"] } } }',
			],
		}),
	)
	.action(async (_opts, cmd) => {
		// Dynamic import to avoid loading MCP SDK unless needed
		const { startMcpServer } = await import('../mcp/server');
		// Walk up to the root program command
		let root = cmd as Command;
		while (root.parent) {
			root = root.parent as Command;
		}
		await startMcpServer(root);
	});

export const mcpCmd = new Command('mcp')
	.description('MCP server for AI agent integration')
	.addCommand(serveCmd, { isDefault: true });
