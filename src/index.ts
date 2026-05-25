import { fetchAndSummarize } from './fetch';
import { saveLocally, saveToDrive } from './store';

async function run() {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `finance-digest-${date}.md`;

  console.log(`[pipeline] Starting digest for ${date}`);

  const report = await fetchAndSummarize();
  console.log('[pipeline] Digest generated, storing…');

  saveLocally(report, filename);

  try {
    await saveToDrive(report, filename);
  } catch (err) {
    console.warn('[pipeline] Drive upload skipped:', (err as Error).message);
  }

  console.log('[pipeline] Done.');
}

run().catch(err => {
  console.error('[pipeline] Fatal:', err);
  process.exit(1);
});
