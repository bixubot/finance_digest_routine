import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { MCP_SERVERS, MODEL, config } from './config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TURNS = 10;

export function saveLocally(content: string, filename: string): string {
  const dir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, filename);
  fs.writeFileSync(fp, content, 'utf8');
  console.log(`[store] Local: ${fp}`);
  return fp;
}

export async function saveToCloud(content: string, filename: string, date: string): Promise<void> {
  const folderNote = config.driveFolderId
    ? ` in the folder with ID ${config.driveFolderId}`
    : '';
  const recipientList = config.recipients.join(', ');

  const userPrompt = `
1. Create a new Google Drive file named "${filename}"${folderNote} with this markdown content:

${content}

2. Send an email via Gmail to: ${recipientList}
   Subject: "Finance Digest — ${date}"
   Body: the same markdown content above.

Confirm each action as you complete it.`;

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];

  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const response = await (client.messages.create as unknown as (params: object) => Promise<Anthropic.Message>)({
      model:       MODEL,
      max_tokens:  1000,
      system:      'You are a file and email assistant. Complete both tasks fully.',
      mcp_servers: MCP_SERVERS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    response.content
      .filter((b: Anthropic.ContentBlock) => b.type === 'text')
      .forEach((b: Anthropic.ContentBlock) =>
        console.log('[store]', (b as Anthropic.TextBlock).text)
      );

    if (response.stop_reason === 'end_turn') break;

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
}
