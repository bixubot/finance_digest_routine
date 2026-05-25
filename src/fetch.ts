import Anthropic from '@anthropic-ai/sdk';
import { config, headlineCount } from './config';

const client = new Anthropic({ apiKey: config.anthropicKey });

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const { default: pRetry } = await import('p-retry');

  return pRetry(async () => {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search' }],
      messages: [{ role: 'user', content: userPrompt }]
    });

    const textBlocks = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text);

    if (!textBlocks.length) throw new Error('No text content returned from Claude API');
    return textBlocks.join('\n').trim();
  }, {
    retries: 3,
    minTimeout: 2000,
    factor: 2,
    onFailedAttempt: (error) => {
      console.warn(`[fetch] Attempt ${error.attemptNumber} failed. Retrying…`);
    }
  });
}

export async function fetchAndSummarize(): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const topicsStr = config.topics.join(', ');
  const focusNote = config.customFocus ? ` Special focus: ${config.customFocus}.` : '';
  const deepSection = config.depth === 'deep'
    ? '\n## Macro Analysis\n(200-word macro implications)\n## Key Risks\n(3 risks to watch)'
    : '';

  const systemPrompt = `You are a senior financial analyst. Today is ${today}.
Produce a structured daily finance digest in markdown.

Format exactly:
# Daily Finance Digest — ${today}
## Summary
(2-3 sentence overview)
## Top Headlines
(numbered list, ${headlineCount} items — headline, source, 1-sentence takeaway each)
## Key Themes
(3-5 bullet themes)${deepSection}
## Market Signals
(equities, rates, commodities, FX — 1 line each)

Analyst-grade tone. No filler. Factual only.`;

  const userPrompt = `Search and summarize today's top ${headlineCount} finance headlines covering: ${topicsStr}.${focusNote}`;

  const maxTokens = config.depth === 'deep' && config.topics.length > 4 ? 4000 : 2000;

  return callClaude(systemPrompt, userPrompt, maxTokens);
}
