#!/usr/bin/env node
// src/cli.ts
import { Command } from 'commander';
import { loadConfig, resolveTimezone } from './config.js';
import { resolveProjectId } from './project.js';
import { FileStorage } from './storage/file.js';
import { createAdapter } from './adapters/index.js';
import { BUILTIN_PHASES } from './phases/index.js';
import { Orchestrator } from './orchestrator.js';
import { DEFAULT_CONFIG, PHASE_IDS, type PhaseId } from './types.js';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stringify } from 'yaml';

const program = new Command();

program
  .name('oneira')
  .description('Your agent sleeps. Oneira dreams.')
  .version('0.0.1');

program
  .command('init')
  .description('Create oneira.yaml config')
  .action(async () => {
    const configPath = join(process.cwd(), 'oneira.yaml');
    if (existsSync(configPath)) {
      process.stderr.write('oneira.yaml already exists. Delete it first to reinitialize.\n');
      process.exit(1);
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      process.stderr.write('Warning: ANTHROPIC_API_KEY not set. Set it before running `oneira dream`.\n');
    } else {
      // Validate key with a minimal test
      try {
        const adapter = await createAdapter('anthropic');
        await adapter.complete('Say "ok" and nothing else.');
        process.stdout.write('API key validated.\n');
      } catch (e) {
        process.stderr.write(`Warning: API key validation failed: ${(e as Error).message}\n`);
      }
    }

    const config = {
      provider: 'anthropic',
      phases: [...PHASE_IDS],
      schedule: {
        start: '22:00',
        end: '06:00',
        timezone: 'auto',
      },
      lucid: null,
    };

    writeFileSync(configPath, stringify(config));
    process.stdout.write(`Created oneira.yaml\n`);
  });

program
  .command('dream')
  .description('Run a dream cycle')
  .option('--phases <phases>', 'Comma-separated phase IDs to run')
  .action(async (opts) => {
    try {
      const projectId = resolveProjectId();
      const config = loadConfig(process.cwd(), projectId);

      // Override phases if specified (partial run - doesn't affect state)
      if (opts.phases) {
        const requested = opts.phases.split(',').map((p: string) => p.trim()) as PhaseId[];
        const invalid = requested.filter((p) => !PHASE_IDS.includes(p));
        if (invalid.length > 0) {
          process.stderr.write(`Unknown phases: ${invalid.join(', ')}. Valid: ${PHASE_IDS.join(', ')}\n`);
          process.exit(1);
        }
        config.phases = requested;
      }

      const baseDir = join(homedir(), '.oneira', projectId);
      const storage = new FileStorage(baseDir);
      const llm = await createAdapter(config.provider);
      const memory = storage.getMemoryStore();

      const orchestrator = new Orchestrator({
        config,
        storage,
        llm,
        memory,
        phases: BUILTIN_PHASES,
        ...(opts.phases ? { partialRun: true } : {}),
      });

      process.stdout.write(`Starting dream cycle for ${config.project}...\n\n`);
      await orchestrator.run();
      process.stdout.write('\nDream cycle complete.\n');
    } catch (e) {
      process.stderr.write(`Error: ${(e as Error).message}\n`);
      process.exit(1);
    }
  });

program
  .command('lucid [prompt]')
  .description('Set or clear lucid dream prompt')
  .option('--clear', 'Clear the lucid prompt')
  .action(async (prompt, opts) => {
    const projectId = resolveProjectId();
    const baseDir = join(homedir(), '.oneira', projectId);
    const storage = new FileStorage(baseDir);
    const state = await storage.readState();

    if (opts.clear) {
      state.lucidPrompt = null;
      await storage.writeState(state);
      process.stdout.write('Lucid dream prompt cleared.\n');
    } else if (prompt) {
      state.lucidPrompt = prompt;
      await storage.writeState(state);
      process.stdout.write(`Lucid dream set: "${prompt}". Next dream will focus on this.\n`);
    } else {
      if (state.lucidPrompt) {
        process.stdout.write(`Current lucid prompt: "${state.lucidPrompt}"\n`);
      } else {
        process.stdout.write('No lucid dream prompt set. Usage: oneira lucid "your topic"\n');
      }
    }
  });

program
  .command('journal [date]')
  .description('Print a dream journal')
  .action(async (date) => {
    const projectId = resolveProjectId();
    const baseDir = join(homedir(), '.oneira', projectId);
    const storage = new FileStorage(baseDir);

    if (date) {
      const journal = await storage.readJournal(date);
      if (!journal) {
        process.stderr.write(`No dream journal found for ${date}.\n`);
        process.exit(1);
      }
      process.stdout.write(journal);
    } else {
      const journals = await storage.listJournals();
      if (journals.length === 0) {
        process.stderr.write('No dreams found. Run `oneira dream` first.\n');
        process.exit(1);
      }
      const latest = journals[journals.length - 1];
      const journal = await storage.readJournal(latest);
      process.stdout.write(journal || '');
    }
  });

program
  .command('schedule')
  .description('Print platform-specific scheduler setup instructions')
  .action(() => {
    const platform = process.platform;
    const cwd = process.cwd();

    process.stdout.write('To dream every night automatically, set up a scheduler:\n\n');

    if (platform === 'darwin') {
      process.stdout.write('macOS (cron):\n');
      process.stdout.write(`  Run: crontab -e\n`);
      process.stdout.write(`  Add: 3 22 * * * cd ${cwd} && npx oneira dream >> ~/.oneira/dream.log 2>&1\n\n`);
    } else if (platform === 'linux') {
      process.stdout.write('Linux (cron):\n');
      process.stdout.write(`  Run: crontab -e\n`);
      process.stdout.write(`  Add: 3 22 * * * cd ${cwd} && npx oneira dream >> ~/.oneira/dream.log 2>&1\n\n`);
    } else {
      process.stdout.write('Add a scheduled task to run:\n');
      process.stdout.write(`  cd ${cwd} && npx oneira dream\n`);
      process.stdout.write('  Schedule: daily at 22:00\n\n');
    }

    process.stdout.write('This runs one dream cycle at 22:03 each night.\n');
    process.stdout.write('Check results: oneira journal\n');
  });

program.parse();
