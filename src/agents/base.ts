import Anthropic from '@anthropic-ai/sdk';
import { MODEL, MCP_SERVERS } from '../config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TURNS = 10; // cap agentic loop to control cost

export interface AgentConfig {
  systemPrompt: string;
  userPrompt:   string;
  maxTokens?:   number;
}

export async function runAgent(cfg: AgentConfig): Promise<string> {
  const { default: pRetry } = await import('p-retry');

  return pRetry(async () => {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: cfg.userPrompt }
    ];

    let turns = 0;

    while (turns < MAX_TURNS) {
      turns++;

      // mcp_servers is not yet in the SDK types — cast via unknown to bypass
      const response = await (client.messages.create as unknown as (params: object) => Promise<Anthropic.Message>)({
        model:       MODEL,
        max_tokens:  cfg.maxTokens ?? 1500,
        system:      cfg.systemPrompt,
        tools:       [{ type: 'web_search_20250305', name: 'web_search' }],
        mcp_servers: MCP_SERVERS,
        messages,
      });

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') {
        const text = response.content
          .filter((b: Anthropic.ContentBlock) => b.type === 'text')
          .map((b: Anthropic.ContentBlock) => (b as Anthropic.TextBlock).text)
          .join('\n')
          .trim();
        if (!text) throw new Error('Empty response from model');
        return text;
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

    throw new Error(`Agent exceeded ${MAX_TURNS} turns without finishing`);
  }, {
    retries: 3,
    minTimeout: 2000,
    factor: 2,
    onFailedAttempt: (err) => {
      console.warn(`[base] Attempt ${err.attemptNumber} failed. Retrying…`);
    },
  });
}
