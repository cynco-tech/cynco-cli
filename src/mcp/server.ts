import type { Command } from '@commander-js/extra-typings';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { VERSION } from '../lib/version';
import { buildArgv, generateToolDefs, type McpToolDef } from './tools';

/**
 * Creates and starts the MCP server, exposing all CLI commands as tools.
 */
export async function startMcpServer(program: Command): Promise<void> {
	const server = new Server(
		{ name: 'cynco-cli', version: VERSION },
		{ capabilities: { tools: {} } },
	);

	const toolDefs = generateToolDefs(program);
	const toolMap = new Map<string, McpToolDef>();
	for (const def of toolDefs) {
		toolMap.set(def.name, def);
	}

	// List tools handler
	server.setRequestHandler(ListToolsRequestSchema, async () => ({
		tools: toolDefs.map((def) => ({
			name: def.name,
			description: def.description,
			inputSchema: def.inputSchema,
		})),
	}));

	// Call tool handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const toolDef = toolMap.get(request.params.name);
		if (!toolDef) {
			return {
				content: [{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` }],
				isError: true,
			};
		}

		try {
			const params = (request.params.arguments ?? {}) as Record<string, unknown>;
			const result = await executeCommand(program, toolDef, params);
			return {
				content: [{ type: 'text' as const, text: result }],
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return {
				content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
				isError: true,
			};
		}
	});

	const transport = new StdioServerTransport();
	await server.connect(transport);
}

/**
 * Executes a CLI command by constructing argv and capturing stdout.
 */
async function executeCommand(
	program: Command,
	toolDef: McpToolDef,
	params: Record<string, unknown>,
): Promise<string> {
	const argv = buildArgv(toolDef, params);

	// Capture stdout by temporarily replacing process.stdout.write
	const chunks: string[] = [];
	const originalWrite = process.stdout.write.bind(process.stdout);
	const originalLog = console.log;
	const originalExit = process.exit;

	// Override console.log to capture output
	console.log = (...args: unknown[]) => {
		chunks.push(args.map(String).join(' '));
	};

	// Override stdout.write to capture JSON output
	process.stdout.write = ((chunk: string | Buffer) => {
		chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
		return true;
	}) as typeof process.stdout.write;

	// Prevent process.exit from killing the MCP server
	process.exit = ((code?: number) => {
		throw new ExitInterrupt(code ?? 0);
	}) as typeof process.exit;

	try {
		await program.parseAsync(argv);
	} catch (err) {
		if (err instanceof ExitInterrupt) {
			// Expected — command called process.exit
			if (err.code !== 0 && chunks.length === 0) {
				throw new Error(`Command exited with code ${err.code}`);
			}
		} else {
			throw err;
		}
	} finally {
		// Restore originals
		process.stdout.write = originalWrite;
		console.log = originalLog;
		process.exit = originalExit;
	}

	const output = chunks.join('\n').trim();
	return output || JSON.stringify({ success: true });
}

class ExitInterrupt extends Error {
	constructor(public code: number) {
		super(`Process exit: ${code}`);
		this.name = 'ExitInterrupt';
	}
}
