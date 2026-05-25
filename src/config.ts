import dotenv from 'dotenv';
dotenv.config();

export const config = {
  anthropicKey: process.env.ANTHROPIC_API_KEY!,
  topics: (process.env.TOPICS || 'Markets,Macro economy').split(',').map(t => t.trim()),
  depth: (process.env.REPORT_DEPTH || 'standard') as 'brief' | 'standard' | 'deep',
  customFocus: process.env.CUSTOM_FOCUS || '',
  drive: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  }
};

const depthMap = { brief: 5, standard: 10, deep: 15 };
export const headlineCount = depthMap[config.depth];
