import { runAgent } from './base';
import { config, headlineCount, AgentResult } from '../config';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export async function runFixedIncomeAgent(): Promise<AgentResult> {
  try {
    const content = await runAgent({
      systemPrompt: `You are a fixed income analyst. Today is ${today}.
Search for today's top ${headlineCount} fixed income developments.
Return a markdown section with:
## Fixed income
- Key Treasury yields (2Y, 10Y, 30Y) and moves
- 2s10s spread
- Investment grade and high yield credit spreads
- Notable issuance or rating actions
Be concise and data-driven. No filler.`,
      userPrompt: `Search and summarise today's fixed income news covering: ${config.topics.fixedIncome}`,
    });
    return { section: 'Fixed income', content };
  } catch (e) {
    return { section: 'Fixed income', content: '', error: (e as Error).message };
  }
}
