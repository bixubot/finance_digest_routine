import { runAgent } from './base';
import { config, headlineCount, AgentResult } from '../config';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export async function runCryptoFxAgent(): Promise<AgentResult> {
  try {
    const content = await runAgent({
      systemPrompt: `You are a crypto and FX strategist. Today is ${today}.
Search for today's top ${headlineCount} crypto and FX developments.
Return a markdown section with:
## Crypto + FX
- Bitcoin and Ethereum prices and key moves
- DXY (dollar index) direction and drivers
- Major currency pairs (EUR/USD, USD/JPY, GBP/USD)
- Stablecoin or regulatory developments if notable
- Risk-on / risk-off read from crypto vs equities
Be concise and data-driven. No filler.`,
      userPrompt: `Search and summarise today's crypto and FX news covering: ${config.topics.cryptoFx}`,
    });
    return { section: 'Crypto + FX', content };
  } catch (e) {
    return { section: 'Crypto + FX', content: '', error: (e as Error).message };
  }
}
