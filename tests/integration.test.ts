// tests/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Orchestrator, calculateDreamDate } from '../src/orchestrator.js';
import { FileStorage } from '../src/storage/file.js';
import { BUILTIN_PHASES } from '../src/phases/index.js';
import type { LLMAdapter, OneiraConfig } from '../src/types.js';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock LLM that returns valid structured responses
const mockLLM: LLMAdapter = {
  async complete(prompt: string) {
    return 'Mock response';
  },
  async completeJSON<T>(prompt: string) {
    // Check most-specific ROLE lines first to avoid false matches from
    // previous phase content embedded in later prompts (e.g. the review
    // phase prompt includes all prior phase outputs, so a naive
    // `includes('simulation')` would match inside the review prompt too).
    if (prompt.includes('adversarial self-review')) {
      return { grades: { codeQuality: 'Good', dreamInsights: 'Novel', consistency: 'Consistent' }, issues: [], priorities: ['Ship v1', 'Add tests', 'Write docs'], qualityScore: 8, insights: ['Meta insight'] } as T;
    }
    if (prompt.includes('memory consolidation')) {
      return { activitySummary: 'Integration test run', strengthened: [], stale: [], contradictions: [], gaps: [], insights: ['Test insight'] } as T;
    }
    if (prompt.includes('creative synthesis')) {
      return { pairs: [{ a: 'moduleA', b: 'moduleB', idea: 'Combine them', novelty: 7, feasibility: 8, combined: 15, keep: true }], insights: ['Creative insight'] } as T;
    }
    if (prompt.includes('hypothesis')) {
      return { hypotheses: [{ question: 'Does X cause Y?', evidence: 'commit abc', experiment: 'Test it', timeline: '1 week' }], insights: ['Hypothesis insight'] } as T;
    }
    if (prompt.includes('simulation')) {
      return { scenarios: [{ title: 'What if CI fails?', type: 'failure', impact: 'Delays', mitigation: 'Cache deps', readiness: 'Ready' }], vulnerabilities: [], insights: ['Sim insight'] } as T;
    }
    if (prompt.includes('self-experimentation')) {
      return { experiments: [], insights: [] } as T;
    }
    if (prompt.includes('draft factory')) {
      return { drafts: [{ type: 'changelog', name: 'v0.1', description: 'Release notes', content: '# v0.1\n\nInitial release' }], insights: ['Draft insight'] } as T;
    }
    return {} as T;
  },
};

describe('integration: full dream cycle', () => {
  const baseDir = join(tmpdir(), 'oneira-integration-' + Date.now());
  let storage: FileStorage;

  beforeEach(() => {
    storage = new FileStorage(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('runs all 7 phases and produces a complete journal', async () => {
    const config: OneiraConfig = {
      provider: 'anthropic',
      phases: ['consolidation', 'synthesis', 'hypothesis', 'simulation', 'experimentation', 'drafts', 'review'],
      schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
      storage: 'file',
      lucid: null,
      project: 'integration-test',
    };

    const orchestrator = new Orchestrator({
      config,
      storage,
      llm: mockLLM,
      memory: storage.getMemoryStore(),
      phases: BUILTIN_PHASES,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    // Verify state
    const state = await storage.readState();
    expect(state.currentDreamDate).toBe('2026-04-03');
    expect(state.completedPhases).toHaveLength(7);

    // Verify journal
    const journal = await storage.readJournal('2026-04-03');
    expect(journal).toBeTruthy();
    expect(journal).toContain('# Oneira Dream Journal');
    expect(journal).toContain('## Memory Consolidation');
    expect(journal).toContain('## Creative Synthesis');
    expect(journal).toContain('## Hypotheses');
    expect(journal).toContain('## Simulation & Rehearsal');
    expect(journal).toContain('## Self-Experimentation');
    expect(journal).toContain('## Draft Factory');
    expect(journal).toContain('## Self-Review');
    expect(journal).toContain('## Morning Gift');
    expect(journal).toContain('Ship v1');

    // Verify quality score was filled in
    expect(journal).not.toContain('Score: ?/10');
    expect(journal).toContain('Phases completed: 7/7');
  });
});
