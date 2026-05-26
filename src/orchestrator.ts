import { runMacroAgent }       from './agents/macro';
import { runEquitiesAgent }    from './agents/equities';
import { runFixedIncomeAgent } from './agents/fixed-income';
import { runCommoditiesAgent } from './agents/commodities';
import { runCryptoFxAgent }    from './agents/crypto-fx';
import { runSynthesis }        from './synthesis';
import { saveLocally, saveToCloud } from './store';
import { AgentResult }         from './config';

const SPECIALIST_TIMEOUT_MS = 90_000; // 90s per specialist

/** Races a promise against a timeout; rejects with a descriptive error if exceeded */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Runs all five specialists concurrently with per-agent timeout.
 * Uses p-limit(3) to cap simultaneous API calls if hitting rate limits.
 */
async function runSpecialists(): Promise<AgentResult[]> {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(5); // allow all 5 to run in parallel; lower to 3 if rate-limited

  const tasks: Array<() => Promise<AgentResult>> = [
    () => withTimeout(runMacroAgent(),       SPECIALIST_TIMEOUT_MS, 'Macro'),
    () => withTimeout(runEquitiesAgent(),    SPECIALIST_TIMEOUT_MS, 'Equities'),
    () => withTimeout(runFixedIncomeAgent(), SPECIALIST_TIMEOUT_MS, 'Fixed income'),
    () => withTimeout(runCommoditiesAgent(), SPECIALIST_TIMEOUT_MS, 'Commodities'),
    () => withTimeout(runCryptoFxAgent(),    SPECIALIST_TIMEOUT_MS, 'Crypto + FX'),
  ];

  return Promise.all(tasks.map(task => limit(task)));
}

async function main() {
  const date     = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const isoDate  = new Date().toISOString().slice(0, 10);
  const filename = `finance-digest-${isoDate}.md`;

  console.log(`[orchestrator] Starting — ${date}`);
  console.log('[orchestrator] Launching 5 specialist agents in parallel…');

  const results = await runSpecialists();

  const errors = results.filter(r => r.error);
  if (errors.length) {
    console.warn(`[orchestrator] ${errors.length} specialist(s) failed — continuing with partial data`);
    errors.forEach(r => console.warn(`  [!] ${r.section}: ${r.error}`));
  }

  console.log('[orchestrator] All specialists complete. Running synthesis…');
  const report = await runSynthesis(results, date);

  console.log('[orchestrator] Synthesis complete. Storing…');
  saveLocally(report, filename);
  await saveToCloud(report, filename, date);

  console.log('[orchestrator] Done.');
}

main().catch(err => {
  console.error('[orchestrator] Fatal:', err);
  process.exit(1);
});
