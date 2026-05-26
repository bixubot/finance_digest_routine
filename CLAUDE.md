# Finance Daily Digest — multi-agent edition

Five specialist agents run in parallel, each focused on a distinct finance domain. Their outputs converge into a synthesis agent that produces one comprehensive report, saved to Google Drive and emailed via Gmail MCP.

## Commands

```bash
npm run dev        # ts-node src/orchestrator.ts — run full pipeline once
npm run build      # tsc
npm run start      # node dist/orchestrator.js
```

`package.json` scripts:
```json
"scripts": {
  "dev": "ts-node src/orchestrator.ts",
  "build": "tsc",
  "start": "node dist/orchestrator.js"
}
```

## Architecture

```
src/
├── orchestrator.ts          Entry point — runs all specialists in parallel, then synthesis
├── agents/
│   ├── base.ts              Shared runAgent(config) loop used by every specialist
│   ├── macro.ts             Macro economy: GDP, CPI, central banks, rates
│   ├── equities.ts          Equities: indices, earnings, sector rotation
│   ├── fixed-income.ts      Fixed income: bonds, yields, credit spreads
│   ├── commodities.ts       Commodities: oil, gold, agriculture
│   └── crypto-fx.ts         Crypto + FX: BTC/ETH, major currency pairs
├── synthesis.ts             Merges all specialist outputs into one report
├── store.ts                 Google Drive MCP upload + Gmail MCP send
└── config.ts                Env loader, shared types
reports/                     Local output — git-ignored
logs/                        Cron logs — git-ignored
```

## Agent roles

| Agent | Focus | Key signals |
|---|---|---|
| Macro | GDP, CPI, jobs, central bank policy | Fed/ECB/BoJ decisions, yield curve shape |
| Equities | S&P 500, Nasdaq, Dow, earnings | Index moves, notable earnings beats/misses |
| Fixed income | Treasuries, IG/HY credit, duration | 2s10s spread, credit spreads, IG issuance |
| Commodities | Oil (WTI/Brent), gold, copper, agri | Supply/demand shocks, geopolitical premium |
| Crypto + FX | BTC, ETH, EUR/USD, USD/JPY, DXY | Risk-on/off signals, stablecoin flows |
| Synthesis | All of the above | Cross-asset themes, macro implications, risks |

## Parallelism model

All five specialists are launched via `Promise.all` — they run concurrently and race to finish. The orchestrator awaits all results, then passes the full set to the synthesis agent. Total wall-clock time ≈ slowest specialist + synthesis (not sum of all agents).

```
t=0s   Macro ──────────────┐
t=0s   Equities ───────────┤
t=0s   Fixed income ───────┼──► Synthesis ──► Store
t=0s   Commodities ────────┤
t=0s   Crypto + FX ────────┘
```

## Environment

```
ANTHROPIC_API_KEY            Anthropic API key
TOPICS_MACRO                 e.g. GDP, CPI, Federal Reserve, ECB
TOPICS_EQUITIES              e.g. S&P 500, Nasdaq, earnings, sector rotation
TOPICS_FIXED_INCOME          e.g. Treasury yields, credit spreads, IG bonds
TOPICS_COMMODITIES           e.g. oil, gold, copper, agricultural commodities
TOPICS_CRYPTO_FX             e.g. Bitcoin, Ethereum, EUR/USD, DXY
REPORT_DEPTH                 brief | standard | deep
EMAIL_RECIPIENTS             Comma-separated list for Gmail send
GOOGLE_DRIVE_FOLDER_ID       (optional) target folder ID
```

No OAuth token management needed — Drive and Gmail are handled by MCP servers.

## MCP servers

Both are already connected on Claude.ai and passed into every agent call:
```typescript
const MCP_SERVERS = [
  { type: 'url', url: 'https://drivemcp.googleapis.com/mcp/v1', name: 'gdrive' },
  { type: 'url', url: 'https://gmailmcp.googleapis.com/mcp/v1', name: 'gmail'  },
];
```

Only the synthesis agent calls Drive and Gmail tools. Specialist agents only use `web_search`.

## Key implementation notes

- `runAgent()` in `base.ts` is the shared agentic loop — all specialists use it, parameterised by system prompt and topic config
- Specialist agents return a markdown string (their section); they do NOT write to Drive or send email
- Synthesis agent receives all five sections and produces the final structured report
- `Promise.all` — if one specialist fails, the orchestrator catches the error, substitutes an error placeholder, and synthesis continues with the remaining sections
- `max_tokens` per specialist: 1500. Synthesis: 4096
- Model pinned to `claude-sonnet-4-20250514` across all agents

## Report structure (synthesis output)

```markdown
# Daily Finance Digest — [date]

## Executive summary
## Macro environment
## Equity markets
## Fixed income
## Commodities
## Crypto + FX
## Cross-asset themes
## Key risks to watch
```

## Scheduling

**Cron**:
```bash
0 7 * * * cd /path/to/finance-digest && npx ts-node src/orchestrator.ts >> logs/digest.log 2>&1
```

**GitHub Actions**: `.github/workflows/daily-digest.yml` — all env vars as repository secrets, scheduled at `0 7 * * *` UTC.

## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| One section shows `[error]` in report | Specialist agent failed | Check logs; re-run manually with `ts-node src/agents/macro.ts` |
| `Promise.all` rejects entirely | Unhandled throw in a specialist | Ensure `runAgent` wraps in try/catch and returns error string |
| Synthesis produces incomplete report | Context too long from specialists | Reduce `max_tokens` per specialist or trim to key findings only |
| Drive upload skipped | MCP auth lapsed | Re-authenticate Drive MCP in Claude.ai settings |
| No email received | Gmail MCP not connected | Check Claude.ai connector settings |
