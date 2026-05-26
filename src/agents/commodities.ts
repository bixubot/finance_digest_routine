import { runAgent } from './base';
import { config, headlineCount, AgentResult } from '../config';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export async function runCommoditiesAgent(): Promise<AgentResult> {
  try {
    const content = await runAgent({
      systemPrompt: `You are a commodities analyst. Today is ${today}.
Search for today's top ${headlineCount} commodities developments.
Return a markdown section with:
## Commodities
- Oil (WTI and Brent prices, supply/demand news)
- Gold (price, drivers)
- Industrial metals (copper, aluminium)
- Agricultural commodities if notable
- Geopolitical supply risk signals
Be concise and data-driven. No filler.`,
      userPrompt: `Search and summarise today's commodities news covering: ${config.topics.commodities}`,
    });
    return { section: 'Commodities', content };
  } catch (e) {
    return { section: 'Commodities', content: '', error: (e as Error).message };
  }
}
