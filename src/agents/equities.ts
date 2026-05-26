import { runAgent } from './base';
import { config, headlineCount, AgentResult } from '../config';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export async function runEquitiesAgent(): Promise<AgentResult> {
  try {
    const content = await runAgent({
      systemPrompt: `You are an equity strategist. Today is ${today}.
Search for today's top ${headlineCount} equity market developments.
Return a markdown section with:
## Equity markets
- Index performance (S&P 500, Nasdaq, Dow, international)
- Notable earnings beats/misses
- Sector rotation signals
- Market breadth and sentiment
Be concise and data-driven. No filler.`,
      userPrompt: `Search and summarise today's equity market news covering: ${config.topics.equities}`,
    });
    return { section: 'Equity markets', content };
  } catch (e) {
    return { section: 'Equity markets', content: '', error: (e as Error).message };
  }
}
