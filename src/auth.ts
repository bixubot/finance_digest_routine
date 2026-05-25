// Run once: npm run auth
// Opens browser → paste code → saves token.json
import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import { config } from './config';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'token.json';

const oauth2 = new google.auth.OAuth2(
  config.drive.clientId,
  config.drive.clientSecret,
  config.drive.redirectUri
);

const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
console.log('Open this URL in your browser:\n', authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nEnter the authorization code: ', async (code) => {
  rl.close();
  const { tokens } = await oauth2.getToken(code);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('token.json saved. You can now run: npm run dev');
});
