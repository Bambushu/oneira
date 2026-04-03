import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse } from 'yaml';
import { DEFAULT_CONFIG, PHASE_IDS, type OneiraConfig, type PhaseId } from './types.js';

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

  return {
    provider: parsed.provider || DEFAULT_CONFIG.provider,
    phases,
    schedule,
    storage: 'file',
    lucid: parsed.lucid ?? null,
    project: projectId,
  };
}
