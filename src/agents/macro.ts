import { runAgent } from './base';
import { config, headlineCount, AgentResult } from '../config';

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

export async function runMacroAgent(): Promise<AgentResult> {
  try {
    const content = await runAgent({
      systemPrompt: `You are a macro economist. Today is ${today}.
Search for today's top ${headlineCount} macro finance developments.
Return a markdown section with:
## Macro environment
- Key data releases (GDP, CPI, jobs)
- Central bank actions or signals (Fed, ECB, BoJ, BoE)
- Yield curve shape and notable moves
- 2-sentence macro outlook
Be concise and data-driven. No filler.`,
      userPrompt: `Search and summarise today's macro economy news covering: ${config.topics.macro}`,
    });
    return { section: 'Macro environment', content };
  } catch (e) {
    return { section: 'Macro environment', content: '', error: (e as Error).message };
  }
}
