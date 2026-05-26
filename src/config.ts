import dotenv from 'dotenv';
dotenv.config();

export const MCP_SERVERS = [
  { type: 'url' as const, url: 'https://drivemcp.googleapis.com/mcp/v1', name: 'gdrive' },
  { type: 'url' as const, url: 'https://gmailmcp.googleapis.com/mcp/v1', name: 'gmail'  },
];

export const MODEL = 'claude-sonnet-4-20250514';

export const config = {
  anthropicKey:  process.env.ANTHROPIC_API_KEY!,
  depth:         (process.env.REPORT_DEPTH || 'standard') as 'brief' | 'standard' | 'deep',
  recipients:    (process.env.EMAIL_RECIPIENTS || '').split(',').map(s => s.trim()).filter(Boolean),
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  topics: {
    macro:       process.env.TOPICS_MACRO        || 'GDP, CPI, central banks',
    equities:    process.env.TOPICS_EQUITIES     || 'S&P 500, Nasdaq, earnings',
    fixedIncome: process.env.TOPICS_FIXED_INCOME || 'Treasury yields, credit spreads',
    commodities: process.env.TOPICS_COMMODITIES  || 'oil, gold, copper',
    cryptoFx:    process.env.TOPICS_CRYPTO_FX    || 'Bitcoin, EUR/USD, DXY',
  },
};

export const depthMap = { brief: 5, standard: 8, deep: 12 };
export const headlineCount = depthMap[config.depth];

export interface AgentResult {
  section: string;   // markdown section heading
  content: string;   // markdown body
  error?:  string;
}
