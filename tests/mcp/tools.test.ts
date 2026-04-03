import { Command } from '@commander-js/extra-typings';
import { describe, expect, test } from 'vitest';
import { buildArgv, generateToolDefs } from '../../src/mcp/tools';

function createTestProgram(): Command {
	const program = new Command('cynco');

	const invoices = new Command('invoices');
	invoices
		.command('list')
		.description('List invoices')
		.option('--status <status>', 'Filter by status')
		.option('--limit <n>', 'Limit results')
		.action(() => {});

	invoices
		.command('get')
		.description('Get a single invoice')
		.argument('<id>', 'Invoice ID')
		.action(() => {});

	invoices
		.command('create')
		.description('Create an invoice')
		.option('--customer-id <id>', 'Customer ID')
		.option('--currency <code>', 'Currency code')
		.option('--stdin', 'Read JSON from stdin')
		.action(() => {});

	invoices
		.command('delete')
		.description('Delete an invoice')
		.argument('<id>', 'Invoice ID')
		.option('-y, --yes', 'Skip confirmation')
		.action(() => {});

	program.addCommand(invoices);

	// Command group with no action (just a container)
	const auth = new Command('auth');
	auth
		.command('login')
		.description('Log in')
		.option('--key <key>', 'API key')
		.action(() => {});

	program.addCommand(auth);

	return program;
}

describe('generateToolDefs', () => {
	test('generates tool definition for each leaf command with action', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const names = tools.map((t) => t.name);
		expect(names).toContain('invoices_list');
		expect(names).toContain('invoices_get');
		expect(names).toContain('invoices_create');
		expect(names).toContain('invoices_delete');
		expect(names).toContain('auth_login');
	});

	test('does not generate tools for container commands without actions', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const names = tools.map((t) => t.name);
		expect(names).not.toContain('invoices');
		expect(names).not.toContain('auth');
	});

	test('tool names replace hyphens with underscores', () => {
		const program = new Command('cynco');
		const group = new Command('bank-accounts');
		group
			.command('list')
			.description('List bank accounts')
			.action(() => {});
		program.addCommand(group);

		const tools = generateToolDefs(program);
		expect(tools[0].name).toBe('bank_accounts_list');
	});

	test('includes command arguments as required string properties in schema', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const getTool = tools.find((t) => t.name === 'invoices_get');
		expect(getTool).toBeDefined();
		expect(getTool!.inputSchema.properties).toHaveProperty('id');
		expect(getTool!.inputSchema.properties.id.type).toBe('string');
		expect(getTool!.inputSchema.required).toContain('id');
	});

	test('includes command options as properties in schema', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const listTool = tools.find((t) => t.name === 'invoices_list');
		expect(listTool).toBeDefined();
		expect(listTool!.inputSchema.properties).toHaveProperty('status');
		expect(listTool!.inputSchema.properties).toHaveProperty('limit');
	});

	test('excludes global flags from tool schema', () => {
		const program = createTestProgram();
		// Add global flags that should be filtered
		program.option('--json', 'JSON output');
		program.option('--quiet', 'Quiet');
		program.option('--agent', 'Agent mode');
		program.option('--verbose', 'Verbose');
		program.option('--api-key <key>', 'API key');
		program.option('--dry-run', 'Dry run');

		const tools = generateToolDefs(program);
		const listTool = tools.find((t) => t.name === 'invoices_list');
		const props = Object.keys(listTool!.inputSchema.properties);
		expect(props).not.toContain('json');
		expect(props).not.toContain('quiet');
		expect(props).not.toContain('agent');
		expect(props).not.toContain('verbose');
		expect(props).not.toContain('apiKey');
		expect(props).not.toContain('dryRun');
	});

	test('skips commands without description', () => {
		const program = new Command('cynco');
		program
			.command('hidden')
			// No description
			.action(() => {});
		const tools = generateToolDefs(program);
		expect(tools).toHaveLength(0);
	});

	test('description includes command path for disambiguation', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const listTool = tools.find((t) => t.name === 'invoices_list');
		expect(listTool!.description).toContain('invoices list');
	});

	test('stores commandPath for reconstructing argv', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const getTool = tools.find((t) => t.name === 'invoices_get');
		expect(getTool!.commandPath).toEqual(['invoices', 'get']);
	});
});

describe('buildArgv', () => {
	test('constructs argv with command path and --agent flag', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const listTool = tools.find((t) => t.name === 'invoices_list')!;

		const argv = buildArgv(listTool, { status: 'paid', limit: '10' });
		expect(argv[0]).toBe('node');
		expect(argv[1]).toBe('cynco');
		expect(argv).toContain('invoices');
		expect(argv).toContain('list');
		expect(argv).toContain('--agent');
		expect(argv).toContain('--status');
		expect(argv).toContain('paid');
	});

	test('converts camelCase parameter names back to kebab-case flags', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const createTool = tools.find((t) => t.name === 'invoices_create')!;

		const argv = buildArgv(createTool, { customerId: 'cust_123' });
		expect(argv).toContain('--customer-id');
		expect(argv).toContain('cust_123');
	});

	test('handles boolean true parameters as flag-only (no value)', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const deleteTool = tools.find((t) => t.name === 'invoices_delete')!;

		const argv = buildArgv(deleteTool, { yes: true });
		expect(argv).toContain('--yes');
		const yesIndex = argv.indexOf('--yes');
		// Next item should NOT be "true"
		expect(argv[yesIndex + 1]).not.toBe('true');
	});

	test('skips undefined and null parameter values', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const listTool = tools.find((t) => t.name === 'invoices_list')!;

		const argv = buildArgv(listTool, { status: undefined, limit: null });
		expect(argv).not.toContain('--status');
		expect(argv).not.toContain('--limit');
	});

	test('skips boolean false parameters', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const deleteTool = tools.find((t) => t.name === 'invoices_delete')!;

		const argv = buildArgv(deleteTool, { yes: false });
		expect(argv).not.toContain('--yes');
	});

	test('handles empty params object', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const listTool = tools.find((t) => t.name === 'invoices_list')!;

		const argv = buildArgv(listTool, {});
		expect(argv).toEqual(['node', 'cynco', 'invoices', 'list', '--agent']);
	});

	// ── RED TEST: Bug #1 — positional args treated as flags ─────────
	// This test INITIALLY FAILS because buildArgv treats all params as
	// flags (prefixed with --), even positional arguments like <id>.
	// The _argNames field is never populated in McpToolDef.
	test('BUG_FIX: positional arguments appear as bare values not flags', () => {
		const program = createTestProgram();
		const tools = generateToolDefs(program);
		const getTool = tools.find((t) => t.name === 'invoices_get')!;

		const argv = buildArgv(getTool, { id: 'inv_abc123' });
		// id should be a positional argument: [..., 'get', 'inv_abc123', '--agent']
		// NOT a flag: [..., 'get', '--id', 'inv_abc123', '--agent']
		expect(argv).toContain('inv_abc123');
		expect(argv).not.toContain('--id');
		// The value should come right after the command path
		const getIdx = argv.indexOf('get');
		expect(argv[getIdx + 1]).toBe('inv_abc123');
	});
});
