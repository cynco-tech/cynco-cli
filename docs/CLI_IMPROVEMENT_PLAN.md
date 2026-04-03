# Cynco CLI Improvement Plan

> 13 phases. Each phase is one PR. Dependency graph ensures safe ordering.
> Estimated version progression: v0.1.0 → v0.5.0

## Audit Correction

The initial audit reported 10 "stub" commands. After reading every source file, **all commands are fully implemented** — invoices finalize/send/void/record-payment, customers update/delete, items update/delete, api-keys create/delete, webhooks create/update/delete, journal-entries batch all use proper action helpers with complete Commander options and API calls.

The real gaps are: **functional depth** (no line items, no search, no CSV export), **engineering quality** (no shared types, no CI, shallow tests), and **UX polish** (no --verbose, no empty state guidance, no --output flag).

---

## Dependency Graph

```
Phase 0 (CI + Test Infra)
  │
  v
Phase 1 (Shared API Types)
  │
  ├──→ Phase 2 (--verbose + Request IDs)
  │      │
  │      v
  │    Phase 7 (Doctor + API Versioning)
  │
  ├──→ Phase 3 (--output + CSV Export)
  │      │
  │      v
  │    Phase 5 (Search & Filtering)
  │
  ├──→ Phase 4 (Line Items on Create)
  │
  ├──→ Phase 6 (Empty States + Help UX)
  │
  ├──→ Phase 8 (cynco status Dashboard)
  │
  ├──→ Phase 9 (Webhook Signature Verification)
  │
  v
Phase 10 (Test Coverage Sprint) ← depends on all above
  │
  v
Phase 11 (Shell Completion Auto-Install) ← independent
  │
  v
Phase 12 (Batch Operations) ← depends on Phase 1, Phase 3
```

**Critical path:** 0 → 1 → 3 → 5
**Parallelizable after Phase 1:** Phases 2, 4, 6, 8, 9

---

## Phase 0: CI Hardening & Test Infrastructure
**PR:** `ci: add coverage reporting and test infrastructure improvements`
**Size:** S | **Risk:** Low | **Depends on:** nothing

### Why first
Every subsequent phase needs CI to catch regressions. Existing CI runs lint/typecheck/test but has no coverage enforcement.

### Changes
| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Add `--coverage` flag, upload artifact |
| `vitest.config.ts` | Add coverage config (provider: v8, thresholds) |
| `tests/helpers.ts` | Add `createMockClient()`, `expectJsonOutput()`, `expectErrorContains()` |
| `tests/fixtures/index.ts` | **Create** — shared mock data (invoices, customers, etc.) |
| `package.json` | Add `@vitest/coverage-v8` dev dep, `test:coverage` script |

### Acceptance criteria
- [x] `pnpm test:coverage` produces HTML/lcov report
- [x] CI posts coverage percentage
- [x] All 39 existing test files pass unchanged
- [x] `createMockClient()` works for success and error scenarios

---

## Phase 1: Shared API Types
**PR:** `refactor: introduce shared API types for all resource responses`
**Size:** M | **Risk:** Low-Med | **Depends on:** Phase 0

### Why
Response shapes are inline in each command's `utils.ts`. No compile-time guarantee the client and commands agree on shapes. Before building richer features (line items, search, CSV), types must be centralized.

### Changes

**Create `src/types/` directory:**
| File | Types |
|------|-------|
| `common.ts` | `PaginationInfo`, `ApiMeta` (with `requestId`), `ListResponse<K, T>` |
| `invoice.ts` | `Invoice`, `InvoiceLineItem`, `InvoiceCreatePayload`, `InvoicePaymentPayload` |
| `customer.ts` | `Customer`, `CustomerCreatePayload`, `CustomerUpdatePayload` |
| `vendor.ts` | `Vendor`, same pattern |
| `bill.ts` | `Bill`, `BillLineItem`, `BillCreatePayload` |
| `item.ts` | `Item`, `ItemCreatePayload`, `ItemUpdatePayload` |
| `account.ts` | `Account`, `AccountListResponse` |
| `journal-entry.ts` | `JournalEntry`, `JournalEntryLine`, `BatchResult` |
| `bank.ts` | `BankAccount`, `BankTransaction` |
| `webhook.ts` | `Webhook`, `WebhookEvent` |
| `api-key.ts` | `ApiKey`, `CreateApiKeyResponse` |
| `report.ts` | `ReportData`, `ReportRow` |
| `api.ts` | Barrel re-export |

**Modify:** Every `commands/*/utils.ts` — replace inline types with imports from `../../types/`. Keep render functions in utils.

### Acceptance criteria
- [x] `pnpm typecheck` passes with zero errors
- [x] All existing tests pass unchanged (structural types, mocks still conform)
- [x] Zero runtime behavior changes — pure refactor
- [x] Every inline response type replaced with named import

---

## Phase 2: `--verbose` Flag & Request IDs in Errors
**PR:** `feat: add --verbose flag and surface request IDs in errors`
**Size:** S | **Risk:** Low | **Depends on:** Phase 1

### Changes
| File | Change |
|------|--------|
| `src/cli.ts` | Add `.option('--verbose', 'Show request/response details')` |
| `src/lib/client.ts` | Add `setVerbose()` module flag. Log req method/URL/headers to stderr when verbose. Extract `meta.requestId` from responses. |
| `src/lib/output.ts` | `outputError` accepts optional `requestId`. Human: `Error: msg (request ID: req_xxx)`. JSON: adds `requestId` field. |
| `src/lib/spinner.ts` | Pass `requestId` from error responses to `outputError` |

### Key constraint
Verbose output goes to **stderr only**. `cynco invoices list --verbose --json` still outputs clean JSON to stdout.

### Acceptance criteria
- [x] `cynco invoices list --verbose` prints request details to stderr
- [x] Error messages include `requestId` when API provides one
- [x] `--verbose 2>/dev/null` behaves identically to current behavior

---

## Phase 3: `--output` Flag & CSV Export
**PR:** `feat: add --output flag with csv/table/json formats for list commands`
**Size:** M | **Risk:** Medium | **Depends on:** Phase 1

### Changes

**Create:**
| File | Purpose |
|------|---------|
| `src/lib/csv.ts` | Zero-dep CSV serializer. `toCsv(headers, rows)` with proper quoting. |

**Modify:**
| File | Change |
|------|--------|
| `src/cli.ts` | Add `-o, --output <format>` global option |
| `src/lib/output.ts` | Add `OutputFormat` type, `resolveOutputFormat()` function |
| `src/lib/actions.ts` | `runList` gains optional `csvConfig: { headers, toRow }`. When format=csv, serialize via `toCsv`. |
| All 13 `*/list.ts` commands | Add csv config with headers + row mapper |
| `src/commands/cash.ts` | Add csv config |

### Backward compatibility
- `--json` unchanged. Piped output defaults to JSON (unchanged).
- `-o json` equivalent to `--json`. `-o csv` and `-o table` are new.
- `-o` short flag doesn't conflict with any existing flag.

### Acceptance criteria
- [x] `cynco invoices list -o csv` outputs valid CSV to stdout
- [x] `cynco invoices list -o csv > invoices.csv` creates valid file
- [x] All 13 list commands support `-o csv`
- [x] Pipe detection preserved: `cynco invoices list | cat` still outputs JSON

---

## Phase 4: Line Items on Invoice & Bill Create
**PR:** `feat: add line items support to invoices create and bills create`
**Size:** M | **Risk:** Medium | **Depends on:** Phase 1

### Design: `--items` syntax
Supports two forms (curl convention):
- **Inline JSON:** `--items '[{"description":"Widget","quantity":10,"unitPrice":50}]'`
- **File reference:** `--items @items.json`

If value starts with `@`, treat as file path; otherwise parse as JSON.

### Changes
| File | Change |
|------|--------|
| `src/commands/invoices/create.ts` | Add `--items <json>` option. Interactive mode: loop prompting for line items with "Add another?" |
| `src/commands/bills/create.ts` | Same pattern |
| `src/lib/prompts.ts` | Add `promptForLineItems()` using @clack/prompts loop |
| `src/lib/files.ts` | Add `readJsonFile<T>(path)` — reads + JSON.parse + error handling |

### Acceptance criteria
- [x] `cynco invoices create --customer-id xxx --items '[...]'` sends lineItems in POST body
- [x] `cynco invoices create --customer-id xxx --items @items.json` reads from file
- [x] Interactive mode prompts for line items with add-another loop
- [x] Validation: description required, quantity > 0, unitPrice >= 0
- [x] Same for `cynco bills create`

---

## Phase 5: Search & Filtering on List Commands
**PR:** `feat: add search and filter options to list commands`
**Size:** S | **Risk:** Low | **Depends on:** Phase 3

### Changes
| Command | New flags |
|---------|-----------|
| `invoices list` | `--search <q>`, `--from <date>`, `--to <date>`, `--min-amount`, `--max-amount`, `--customer-id` |
| `customers list` | `--search <q>` |
| `vendors list` | `--search <q>` |
| `bills list` | `--search <q>`, `--status`, `--from`, `--to`, `--vendor-id` |
| `items list` | `--search <q>` |
| `journal-entries list` | `--search <q>`, `--from`, `--to` |
| `bank-transactions list` | `--search <q>`, `--from`, `--to`, `--status` |
| `accounts list` | `--search <q>`, `--type` |

**Infra:** Add `buildFilterParams()` to `src/lib/pagination.ts` — strips undefined values, merges with pagination params.

### Acceptance criteria
- [x] `cynco invoices list --search "Acme"` passes `search=Acme` to API
- [x] Filters compose with pagination: `--search "Acme" --limit 50 --page 2`
- [x] All new options appear in `--help`

---

## Phase 6: Empty State Guidance & Help UX
**PR:** `feat: improve empty state guidance and overdue aging summary`
**Size:** S | **Risk:** Very Low | **Depends on:** Phase 1

### Changes
| File | Change |
|------|--------|
| `src/lib/table.ts` | `renderTable` accepts `emptyMessage` as `string | { message, suggestion }`. Suggestion rendered dimmed. |
| All `*/list.ts` commands | Add contextual suggestions: "Create your first invoice: cynco invoices create" |
| `src/commands/invoices/overdue.ts` | Add aging bucket summary after table (count + total per bucket) |

### Key constraint
Suggestions only in interactive mode. JSON output unchanged (empty array is empty array).

---

## Phase 7: Enhanced `cynco doctor` & API Versioning
**PR:** `feat: expand doctor checks and add API version header`
**Size:** S | **Risk:** Low | **Depends on:** Phase 2

### New doctor checks
1. **Node.js version** — compare `process.version` against `engines.node` (>=20)
2. **API latency** — time the existing API call, warn if >2000ms
3. **Config permissions** — verify 0600 on credentials file (Unix only)
4. **API version** — report `meta.apiVersion` from response

### API versioning
Add `Cynco-API-Version: 2026-03-01` header to all requests via `client.ts`. Static per CLI release. Updated only when CLI adopts new API features.

---

## Phase 8: `cynco status` Dashboard
**PR:** `feat: add cynco status command for business health summary`
**Size:** M | **Risk:** Low-Med | **Depends on:** Phase 1

### Design
Single command, 3-4 **parallel** API calls:
- `GET /bank-accounts` → cash totals by currency
- `GET /invoices?status=overdue&limit=5` → overdue receivables
- `GET /bills?status=pending&limit=5` → upcoming payables
- `GET /reports/cash_flow?period=<current-month>` → monthly summary (optional)

### Output (interactive)
```
Cash Position
  Maybank MYR      MYR  45,230.00
  HSBC USD         USD  12,100.00

Overdue Invoices (3)
  INV-042  Acme Corp    MYR 5,000  31 days
  INV-038  Beta Inc     MYR 2,200  45 days

Upcoming Bills (2)
  BILL-019  Vendor A    MYR 1,500  due Apr 10
```

Each section degrades gracefully if its API call fails ("Could not load cash position").

---

## Phase 9: Webhook Signature Verification
**PR:** `feat: add webhook signature verification to listen command`
**Size:** S | **Risk:** Medium | **Depends on:** Phase 1

### Changes
| File | Change |
|------|--------|
| `src/commands/webhooks/listen.ts` | Check `cynco-signature` header. Add `--secret` and `--no-verify` flags. |
| `src/lib/webhook-verify.ts` | **Create** — `verifyWebhookSignature(body, signature, secret)` using Node.js `crypto.createHmac` |

### Behavior
- Valid signature → green checkmark
- Invalid signature → yellow warning, **still displays event** (dev tool, not production)
- Missing `--secret` without `--no-verify` → warning suggesting to add secret

### Acceptance criteria
- [x] `cynco webhooks listen --secret whsec_xxx` verifies `cynco-signature` header
- [x] Valid → green checkmark, invalid → yellow warning badge
- [x] JSON output includes `signatureVerified` field when secret provided
- [x] `--no-verify` skips verification entirely
- [x] Missing `--secret` shows suggestion in startup banner

---

## Phase 10: Test Coverage Sprint
**PR:** `test: expand coverage to 70%+ across all commands`
**Size:** L | **Risk:** Low | **Depends on:** Phases 0-9

### Scope
- Every command file gets a corresponding test file
- Error paths: missing flags, invalid inputs, API errors
- New features from phases 2-9 get full test coverage
- Target: **70%+ line coverage**

### New/expanded test files
All `tests/commands/invoices/*.test.ts`, `tests/commands/customers/*.test.ts`, `tests/commands/items/*.test.ts`, `tests/commands/api-keys/*.test.ts`, `tests/commands/webhooks/*.test.ts`, `tests/commands/journal-entries/*.test.ts`, `tests/commands/status.test.ts`, `tests/lib/csv.test.ts`, `tests/lib/webhook-verify.test.ts`

### Acceptance criteria
- [x] Every command file gets a corresponding test file
- [x] Error paths: missing flags, invalid inputs tested
- [x] 37 new test files, 278 total tests (from 171)
- [x] Coverage: 33% → ~70% lines
- [x] Coverage thresholds raised to 65%/55%

---

## Phase 11: Shell Completion Auto-Install
**PR:** `feat: cynco completion install for automatic setup`
**Size:** S | **Risk:** Medium | **Depends on:** nothing

### Design
`cynco completion install` detects shell from `$SHELL`, writes eval line to config:
- bash → `~/.bashrc`
- zsh → `~/.zshrc`
- fish → `~/.config/fish/completions/cynco.fish`

**Idempotent:** checks if line already exists. **`--dry-run`** shows what would be written without writing.

### Acceptance criteria
- [x] `cynco completion install` detects shell from `$SHELL`
- [x] Bash/zsh: appends eval line to rc file
- [x] Fish: writes completion file directly
- [x] Idempotent — skips if already installed
- [x] `--dry-run` shows what would be written

---

## Phase 12: Batch Operations
**PR:** `feat: add batch operations for invoices`
**Size:** M | **Risk:** Medium | **Depends on:** Phase 1, Phase 3

### New commands
- `cynco invoices batch-send <ids...>` or `--file ids.txt` or `--stdin`
- `cynco invoices batch-void <ids...>` with `--reason` and `--yes`
- `cynco invoices batch-finalize <ids...>`

### Infrastructure
`src/lib/batch.ts` — generic batch runner with:
- Configurable concurrency (default 5)
- Rate-limit-aware semaphore with backoff
- Progress reporting (interactive) or JSON summary (piped)
- Summary: `"3 sent, 1 failed"` / `{ total, succeeded, failed, results }`

### Input sources
1. Positional args: `batch-send inv_001 inv_002`
2. File: `--file ids.txt` (one ID per line)
3. Pipe: `cynco invoices list --status finalized -o json | jq '.[].id' | cynco invoices batch-send --stdin`

### Acceptance criteria
- [x] `cynco invoices batch-send inv_001 inv_002` sends in parallel
- [x] `cynco invoices batch-void --yes` with `--reason` support
- [x] `cynco invoices batch-finalize --file ids.txt` reads from file
- [x] `--stdin` reads IDs from piped input
- [x] JSON summary output: `{ total, succeeded, failed, results }`
- [x] Concurrency-limited (default 5) batch runner in `src/lib/batch.ts`

---

## Version Bump Strategy

| Phases | Version | Milestone |
|--------|---------|-----------|
| 0-1 | v0.1.0 | No user-facing changes |
| 2-3 | v0.2.0 | `--verbose`, `--output`, CSV export |
| 4-6 | v0.3.0 | Line items, search, UX polish |
| 7-9 | v0.4.0 | Doctor, status, webhook security |
| 10-12 | v0.5.0 | Test hardening, completions, batch ops |

---

## Summary

| Phase | Title | Size | Risk | Dimension |
|-------|-------|------|------|-----------|
| 0 | CI + Test Infra | S | Low | Engineering |
| 1 | Shared API Types | M | Low-Med | Engineering |
| 2 | --verbose + Request IDs | S | Low | UX + Engineering |
| 3 | --output + CSV Export | M | Medium | UX + Product |
| 4 | Line Items on Create | M | Medium | Product |
| 5 | Search & Filtering | S | Low | Product |
| 6 | Empty States + Help | S | Very Low | UX |
| 7 | Doctor + API Version | S | Low | Engineering + UX |
| 8 | cynco status Dashboard | M | Low-Med | Product |
| 9 | Webhook Signatures | S | Medium | Engineering |
| 10 | Test Coverage Sprint | L | Low | Engineering |
| 11 | Completion Auto-Install | S | Medium | UX |
| 12 | Batch Operations | M | Medium | Product |
