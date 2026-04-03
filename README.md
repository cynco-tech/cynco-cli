# Cynco CLI

The official CLI for [Cynco](https://cynco.io) — AI Native Accounting.

```text
   ██████╗██╗   ██╗███╗   ██╗ ██████╗ ██████╗
  ██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝██╔═══██╗
  ██║      ╚████╔╝ ██╔██╗ ██║██║     ██║   ██║
  ██║       ╚██╔╝  ██║╚██╗██║██║     ██║   ██║
  ╚██████╗   ██║   ██║ ╚████║╚██████╗╚██████╔╝
   ╚═════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝
```

Full double-entry accounting from your terminal. Built for humans, AI agents, and CI/CD pipelines.

## Install

```sh
# npm
npm install -g cynco-cli

# curl (macOS / Linux)
curl -fsSL https://cynco.io/install.sh | bash

# PowerShell (Windows)
irm https://cynco.io/install.ps1 | iex
```

Or download a binary from the [releases page](https://github.com/cynco-labs/cynco-cli/releases/latest).

## Quick start

```bash
cynco login                        # Authenticate via browser
cynco status                       # Business health overview
cynco invoices list                # List invoices
cynco tb --period 2026-03          # Trial Balance
cynco extract ./invoice.pdf        # AI document extraction
cynco doctor                       # Verify connectivity
```

## Authentication

Three ways to authenticate, in priority order:

| Priority | Method | Usage |
|----------|--------|-------|
| 1 | `--api-key` flag | `cynco --api-key cak_xxx invoices list` |
| 2 | `CYNCO_API_KEY` env | `export CYNCO_API_KEY=cak_xxx` |
| 3 | Stored profile | `cynco login` |

### Browser login (recommended)

```bash
cynco login
```

Opens your browser for one-click authorization. A verification code is displayed in your terminal — confirm it matches in the browser, click Authorize, done.

### Multi-profile

```bash
cynco login --profile production       # Store key under "production"
cynco invoices list --profile staging  # Use a specific profile
cynco auth switch                      # Switch active profile
cynco auth list                        # List all profiles
```

### CI / Automation

```bash
# Environment variable — no login needed
CYNCO_API_KEY=${{ secrets.CYNCO_API_KEY }} cynco invoices list --agent

# Piped token
echo '{"token":"cak_xxx"}' | cynco login --token-stdin
```

## Commands

### Accounting

| Command | Description |
|---------|-------------|
| `cynco accounts list` | Chart of accounts |
| `cynco journal-entries create` | Create journal entry with debit/credit lines |
| `cynco journal-entries batch` | Batch import journal entries |
| `cynco tb` | Trial Balance |
| `cynco bs` | Balance Sheet |
| `cynco pl` | Profit & Loss (Income Statement) |
| `cynco ar` | Aged Receivables |
| `cynco ap` | Aged Payables |
| `cynco reports generate` | Generate any of 7 report types |

### Invoicing

| Command | Description |
|---------|-------------|
| `cynco invoices list` | List with search, filter, pagination |
| `cynco invoices create` | Create with line items (`--items` or interactive) |
| `cynco invoices send <id>` | Send to customer via email |
| `cynco invoices finalize <id>` | Mark as finalized |
| `cynco invoices void <id>` | Void (irreversible) |
| `cynco invoices record-payment <id>` | Record payment received |
| `cynco invoices overdue` | Overdue list with aging buckets |
| `cynco invoices batch-send` | Bulk send multiple invoices |
| `cynco invoices batch-finalize` | Bulk finalize |
| `cynco invoices batch-void` | Bulk void |

### Customers, Vendors, Bills, Items

Full CRUD on all resources: `list`, `get`, `create`, `update`, `delete`.

```bash
cynco customers create --name "Acme Corp" --email acme@example.com
cynco vendors list --search "supplier"
cynco bills create --vendor-id vend_xxx --items @items.json
cynco items update itm_xxx --unit-price 200
```

### Banking

| Command | Description |
|---------|-------------|
| `cynco bank-accounts list` | All connected accounts |
| `cynco bank-transactions list` | Transaction history |
| `cynco bank-transactions import` | Import from CSV |
| `cynco cash` | Cash position across all accounts |
| `cynco reconcile` | Reconciliation status |

### AI

| Command | Description |
|---------|-------------|
| `cynco extract ./invoice.pdf` | Extract data from any document using AI |

### Platform

| Command | Description |
|---------|-------------|
| `cynco status` | Business health dashboard |
| `cynco config set/get/list` | Persistent CLI settings |
| `cynco history` | Command audit trail |
| `cynco doctor` | Environment diagnostics (7 checks) |
| `cynco whoami` | Current auth profile |
| `cynco api-keys create` | Manage API keys |
| `cynco webhooks listen` | Local webhook dev server |
| `cynco mcp serve` | MCP server for AI agents |
| `cynco completion install` | Shell completions (bash/zsh/fish) |

## Global flags

```bash
cynco [flags] <command> [options]
```

| Flag | Description |
|------|-------------|
| `--api-key <key>` | Override API key |
| `-p, --profile <name>` | Use specific profile |
| `--json` | Force JSON output |
| `-q, --quiet` | Suppress spinners (implies `--json`) |
| `--agent` | Agent mode: JSON, no prompts, no spinners |
| `-n, --dry-run` | Preview destructive operations |
| `--verbose` | Show request/response debug info |
| `-o, --output <fmt>` | Output format: `table`, `json`, `csv` |

## Agent & MCP

### `--agent` flag

Single flag for full machine-readable mode. Forces JSON, suppresses all prompts and spinners.

```bash
cynco invoices list --agent
CYNCO_AGENT=1 cynco customers list    # Environment variable equivalent
```

### `--stdin` for piped input

All create and update commands accept JSON bodies from stdin:

```bash
echo '{"name":"Acme","email":"a@b.com"}' | cynco customers create --stdin
cat customer.json | cynco customers update cust_xxx --stdin
```

Explicit flags override stdin fields.

### Pipe chains

```bash
# List finalized invoices → batch send them
cynco invoices list --status finalized --json | cynco invoices batch-send --stdin

# Smart ID extraction from JSON arrays, objects, NDJSON
cynco customers list --json | cynco customers batch-delete --stdin
```

### `--dry-run`

Preview destructive operations without executing:

```bash
cynco invoices void inv_xxx --dry-run        # Shows what would happen
cynco customers delete cust_xxx --dry-run    # Preview without deleting
cynco customers update cust_xxx --name "New" --dry-run  # Colored diff preview
```

### MCP server

Expose every CLI command as an [MCP](https://modelcontextprotocol.io) tool for AI agents:

```bash
cynco mcp serve
```

Configure in Claude Desktop:

```json
{
  "mcpServers": {
    "cynco": {
      "command": "cynco",
      "args": ["mcp", "serve"]
    }
  }
}
```

Tools are auto-generated from the CLI command tree. Adding a new CLI command automatically creates an MCP tool.

## Output

| Context | Stdout | Stderr |
|---------|--------|--------|
| Terminal (TTY) | Formatted tables | Spinners, prompts |
| Piped / `--json` | Clean JSON | Nothing |
| `--agent` | Clean JSON | Nothing |
| `-o csv` | CSV data | Nothing |

Pipe to any tool and JSON activates automatically:

```bash
cynco invoices list | jq '.[0].id'
cynco invoices list -o csv > invoices.csv
```

Errors always exit code `1`:

```json
{"error": {"message": "Not found", "code": "not_found", "requestId": "req_xxx"}}
```

Validation errors include flag hints:

```
Error: Validation failed
  customerId: Required — try: --customer-id <id>
  dueDate: Invalid format — try: --due-date <YYYY-MM-DD>
```

## Configuration

| File | Purpose |
|------|---------|
| `~/.config/cynco/credentials.json` | API keys (0600 permissions) |
| `~/.config/cynco/settings.json` | Persistent settings |
| `~/.config/cynco/history.jsonl` | Command history |

Respects `$XDG_CONFIG_HOME` on Linux, `%APPDATA%` on Windows.

### Persistent settings

```bash
cynco config set output.format json
cynco config set defaults.currency MYR
cynco config set defaults.limit 50
cynco config set api.timeout 60000
cynco config list
cynco config reset
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 10+

### Setup

```bash
git clone https://github.com/cynco-labs/cynco-cli.git
cd cynco-cli
pnpm install
```

### Commands

```bash
pnpm dev              # Run via tsx
pnpm build            # Bundle to dist/cli.cjs
pnpm build:bin        # Native binary (macOS/Linux/Windows)
pnpm typecheck        # TypeScript strict mode
pnpm lint             # Biome check
pnpm test             # 443 tests via Vitest
pnpm test:coverage    # Coverage report (~70% lines)
```

### Architecture

```
src/
├── cli.ts              Entry point — Commander program, global flags, branding
├── commands/           One directory per resource (14 groups, 130+ files)
├── lib/                Shared utilities (20 modules)
│   ├── client.ts       HTTP client with retry and API versioning
│   ├── actions.ts      runGet/runList/runCreate/runDelete/runWrite helpers
│   ├── table.ts        Borderless whitespace-aligned table renderer
│   ├── branding.ts     ASCII logo, session bar, quick-start
│   ├── stdin.ts        JSON stdin reading and flag merging
│   ├── batch.ts        Batch runner with concurrency and progress bars
│   ├── diff.ts         Colored before/after diff for dry-run
│   ├── settings.ts     Persistent settings store
│   ├── history.ts      Command history (JSONL, auto-rotation)
│   ├── error-hints.ts  API field → CLI flag hint mapping
│   └── ...
├── mcp/                MCP server (auto-generated tools from Commander tree)
├── types/              Shared API response types (14 files)
└── tests/              90 test files, 443 tests
```

**5 runtime dependencies:** Commander, @clack/prompts, picocolors, @modelcontextprotocol/sdk.

## License

MIT
