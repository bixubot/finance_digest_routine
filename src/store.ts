import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { config } from './config';

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

export function saveLocally(content: string, filename: string): string {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[store] Saved locally: ${filePath}`);
  return filePath;
}

function getOAuth2Client() {
  const { clientId, clientSecret, redirectUri } = config.drive;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Google token not found. Run: npm run auth');
  }
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  oauth2.setCredentials(token);

  // Auto-persist refreshed tokens so long-running deployments stay authorized
  oauth2.on('tokens', (tokens) => {
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const updated = { ...current, ...tokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
    console.log('[store] Google token refreshed and persisted');
  });

  return oauth2;
}

export async function saveToDrive(content: string, filename: string): Promise<string> {
  const auth = getOAuth2Client();
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata: Record<string, unknown> = { name: filename, mimeType: 'text/markdown' };
  if (config.drive.folderId) {
    (fileMetadata as { parents?: string[] }).parents = [config.drive.folderId];
  }

  const { Readable } = await import('stream');
  const media = { mimeType: 'text/markdown', body: Readable.from([content]) };

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink'
  });

  const link = res.data.webViewLink || res.data.id!;
  console.log(`[store] Saved to Drive: ${link}`);
  return link;
}
