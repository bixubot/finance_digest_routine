import Anthropic from '@anthropic-ai/sdk';
import { MODEL, MCP_SERVERS, AgentResult } from './config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TURNS = 10;

export async function runSynthesis(results: AgentResult[], date: string): Promise<string> {
  const sections = results.map(r =>
    r.error
      ? `## ${r.section}\n\n_Data unavailable: ${r.error}_`
      : r.content
  ).join('\n\n---\n\n');

  const systemPrompt = `You are a chief investment strategist.
You have received research from five specialist analysts.
Synthesise their findings into one comprehensive daily finance digest.

Output this exact structure in markdown:
# Daily Finance Digest — ${date}

## Executive summary
(3-4 sentences covering the single most important theme across all asset classes)

## Macro environment
(use the macro analyst's section, lightly edited for flow)

## Equity markets
(use the equities analyst's section)

## Fixed income
(use the fixed income analyst's section)

## Commodities
(use the commodities analyst's section)

## Crypto + FX
(use the crypto/FX analyst's section)

## Cross-asset themes
(2-3 bullet themes that cut across multiple sections)

## Key risks to watch
(3 specific, actionable risks for the next 24-48 hours)

Use analyst-grade tone. Preserve specific data points. Do not invent data.`;

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `Here are the five specialist reports:\n\n${sections}\n\nProduce the comprehensive digest now.`
  }];

  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await (client.messages.create as unknown as (params: object) => Promise<Anthropic.Message>)({
      model:       MODEL,
      max_tokens:  4096,
      system:      systemPrompt,
      mcp_servers: MCP_SERVERS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      return response.content
        .filter((b: Anthropic.ContentBlock) => b.type === 'text')
        .map((b: Anthropic.ContentBlock) => (b as Anthropic.TextBlock).text)
        .join('\n')
        .trim();
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = response.content
      .filter((b: Anthropic.ContentBlock) => b.type === 'tool_use')
      .map((b: Anthropic.ContentBlock) => ({
        type:        'tool_result' as const,
        tool_use_id: (b as Anthropic.ToolUseBlock).id,
        content:     'Tool executed.',
      }));

    if (toolResults.length) {
      messages.push({ role: 'user', content: toolResults });
    }
  }

  throw new Error(`Synthesis exceeded ${MAX_TURNS} turns without finishing`);
}
