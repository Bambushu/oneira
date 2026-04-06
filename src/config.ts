import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse } from 'yaml';
import { DEFAULT_CONFIG, DEFAULT_CATCHUP, PHASE_IDS, type OneiraConfig, type PhaseId, type CatchUpPolicy, type CatchUpConfig, type WakelockMode } from './types.js';

export function resolveTimezone(tz: string): string {
  if (tz === 'auto') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return tz;
}

function findConfigFile(cwd: string): string | null {
  const local = join(cwd, 'oneira.yaml');
  if (existsSync(local)) return local;

  const global = join(homedir(), '.oneira', 'config.yaml');
  if (existsSync(global)) return global;

  return null;
}

export function loadConfig(cwd: string, projectId: string): OneiraConfig {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    throw new Error('No config found. Run `oneira init` first.');
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parse(raw) || {};

  let phases: PhaseId[];
  if (parsed.phases) {
    for (const p of parsed.phases) {
      if (!PHASE_IDS.includes(p as PhaseId)) {
        process.stderr.write(`Warning: unknown phase "${p}" in config, skipping.\n`);
      }
    }
    phases = parsed.phases.filter((p: string) => PHASE_IDS.includes(p as PhaseId));
  } else {
    phases = [...DEFAULT_CONFIG.phases];
  }

  const schedule = {
    start: parsed.schedule?.start || DEFAULT_CONFIG.schedule.start,
    end: parsed.schedule?.end || DEFAULT_CONFIG.schedule.end,
    timezone: resolveTimezone(parsed.schedule?.timezone || DEFAULT_CONFIG.schedule.timezone),
  };

  const rawCatchUp = parsed.catchUp || parsed.catch_up || {};
  const catchUp: CatchUpConfig = {
    policy: (['none', 'bounded', 'unlimited'].includes(rawCatchUp.policy) ? rawCatchUp.policy : DEFAULT_CATCHUP.policy) as CatchUpPolicy,
    maxPhasesPerHeartbeat: typeof rawCatchUp.maxPhasesPerHeartbeat === 'number'
      ? rawCatchUp.maxPhasesPerHeartbeat
      : DEFAULT_CATCHUP.maxPhasesPerHeartbeat,
    chainablePairs: Array.isArray(rawCatchUp.chainablePairs)
      ? rawCatchUp.chainablePairs.filter((p: unknown) =>
          Array.isArray(p) && p.length === 2 &&
          PHASE_IDS.includes(p[0] as PhaseId) &&
          PHASE_IDS.includes(p[1] as PhaseId))
      : [...DEFAULT_CATCHUP.chainablePairs],
  };

  const wakelockRaw = parsed.wakelock ?? DEFAULT_CONFIG.wakelock;
  const wakelock: WakelockMode = ['auto', 'macos', 'none'].includes(wakelockRaw)
    ? wakelockRaw as WakelockMode
    : DEFAULT_CONFIG.wakelock;

  return {
    provider: parsed.provider || DEFAULT_CONFIG.provider,
    phases,
    schedule,
    catchUp,
    wakelock,
    storage: 'file',
    lucid: parsed.lucid ?? null,
    project: projectId,
  };
}
