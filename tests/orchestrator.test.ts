import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator, calculateDreamDate } from '../src/orchestrator.js';
import type {
  PhaseHandler,
  PhaseContext,
  PhaseResult,
  StorageAdapter,
  DreamState,
  LLMAdapter,
  MemoryStore,
  PhaseId,
  CatchUpConfig,
} from '../src/types.js';

const UNLIMITED_CATCHUP: CatchUpConfig = {
  policy: 'unlimited',
  maxPhasesPerHeartbeat: 99,
  chainablePairs: [],
};

function createMockStorage(): StorageAdapter & { state: DreamState; journals: Map<string, string>; drafts: string[] } {
  const state: DreamState = {
    currentDreamDate: null,
    completedPhases: [],
    lastDreamAt: null,
    lucidPrompt: null,
  };
  const journals = new Map<string, string>();
  const drafts: string[] = [];

  return {
    state,
    journals,
    drafts,
    async readState() { return { ...state }; },
    async writeState(s: DreamState) { Object.assign(state, s); },
    async readJournal(date: string) { return journals.get(date) || null; },
    async writeJournal(date: string, content: string) { journals.set(date, content); },
    async listJournals() { return [...journals.keys()]; },
    async writeDraft(date: string, name: string, content: string) { drafts.push(`${date}/${name}`); },
  };
}

const mockLLM: LLMAdapter = {
  async complete(prompt: string) { return 'mock response'; },
  async completeJSON<T>(prompt: string, schema: Record<string, unknown>) { return {} as T; },
};

const mockMemory: MemoryStore = {
  async list() { return []; },
  async read() { return null; },
};

function createMockPhase(id: PhaseId): PhaseHandler {
  return async (ctx: PhaseContext): Promise<PhaseResult> => ({
    phase: id,
    journal: `## Mock ${id}\n\nMock output for ${id}`,
    insights: [`insight from ${id}`],
    nightmare: null,
    metadata: {},
  });
}

describe('calculateDreamDate', () => {
  it('returns today for evening hours (22-23)', () => {
    const date = calculateDreamDate(new Date('2026-04-03T22:30:00'));
    expect(date).toBe('2026-04-03');
  });

  it('returns yesterday for early morning hours (0-5)', () => {
    const date = calculateDreamDate(new Date('2026-04-04T03:00:00'));
    expect(date).toBe('2026-04-03');
  });

  it('returns today for daytime hours', () => {
    const date = calculateDreamDate(new Date('2026-04-03T14:00:00'));
    expect(date).toBe('2026-04-03');
  });
});

describe('Orchestrator', () => {
  it('runs all phases and writes journal', async () => {
    const storage = createMockStorage();
    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', createMockPhase('consolidation')],
      ['review', createMockPhase('review')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation', 'review'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: UNLIMITED_CATCHUP,
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    expect(storage.state.completedPhases).toEqual(['consolidation', 'review']);
    expect(storage.state.currentDreamDate).toBe('2026-04-03');
    expect(storage.journals.has('2026-04-03')).toBe(true);

    const journal = storage.journals.get('2026-04-03')!;
    expect(journal).toContain('## Mock consolidation');
    expect(journal).toContain('## Mock review');
    expect(journal).toContain('## Morning Gift');
  });

  it('resumes from incomplete state', async () => {
    const storage = createMockStorage();
    storage.state.currentDreamDate = '2026-04-03';
    storage.state.completedPhases = ['consolidation'] as PhaseId[];
    storage.journals.set('2026-04-03', '# Journal\n\n## Mock consolidation\n\nDone');

    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', createMockPhase('consolidation')],
      ['review', createMockPhase('review')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation', 'review'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T23:30:00'),
    });

    await orchestrator.run();

    expect(storage.state.completedPhases).toEqual(['consolidation', 'review']);
    const journal = storage.journals.get('2026-04-03')!;
    expect(journal).toContain('## Mock review');
  });

  it('clears one-shot lucid prompt after dream', async () => {
    const storage = createMockStorage();
    storage.state.lucidPrompt = 'think about testing';

    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', createMockPhase('consolidation')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    expect(storage.state.lucidPrompt).toBeNull();
  });

  it('partial run does not modify state', async () => {
    const storage = createMockStorage();
    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', createMockPhase('consolidation')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T22:30:00'),
      partialRun: true,
    });

    await orchestrator.run();

    // State should remain untouched (initial empty values)
    expect(storage.state.currentDreamDate).toBeNull();
    expect(storage.state.completedPhases).toEqual([]);
    expect(storage.state.lastDreamAt).toBeNull();

    // But journal should still be written
    expect(storage.journals.has('2026-04-03')).toBe(true);
    const journal = storage.journals.get('2026-04-03')!;
    expect(journal).toContain('## Mock consolidation');
    // Morning Gift should NOT be in journal for partial runs
    expect(journal).not.toContain('## Morning Gift');
  });

  it('bounded catch-up stops after first phase when no chain exists', async () => {
    const storage = createMockStorage();
    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', createMockPhase('consolidation')],
      ['synthesis', createMockPhase('synthesis')],
      ['review', createMockPhase('review')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation', 'synthesis', 'review'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: { policy: 'bounded', maxPhasesPerHeartbeat: 2, chainablePairs: [] },
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    // Only first phase should run - no chainable pairs defined
    expect(storage.state.completedPhases).toEqual(['consolidation']);
  });

  it('bounded catch-up allows chainable pair to run together', async () => {
    const storage = createMockStorage();
    // Pre-complete earlier phases so drafts is the first pending phase
    storage.state.currentDreamDate = '2026-04-03';
    storage.state.completedPhases = ['consolidation', 'synthesis', 'hypothesis', 'simulation', 'experimentation'] as PhaseId[];
    storage.journals.set('2026-04-03', '# Journal\n\nPrevious phases done');

    const phases = new Map<PhaseId, PhaseHandler>([
      ['drafts', createMockPhase('drafts')],
      ['review', createMockPhase('review')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation', 'synthesis', 'hypothesis', 'simulation', 'experimentation', 'drafts', 'review'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: { policy: 'bounded', maxPhasesPerHeartbeat: 2, chainablePairs: [['drafts', 'review']] },
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T23:30:00'),
    });

    await orchestrator.run();

    // Both drafts and review should run - they're a chainable pair
    expect(storage.state.completedPhases).toContain('drafts');
    expect(storage.state.completedPhases).toContain('review');
  });

  it('catch-up policy none stops after every phase', async () => {
    const storage = createMockStorage();
    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', createMockPhase('consolidation')],
      ['review', createMockPhase('review')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation', 'review'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: { policy: 'none', maxPhasesPerHeartbeat: 2, chainablePairs: [] },
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    expect(storage.state.completedPhases).toEqual(['consolidation']);
  });

  it('continues to next phase when a phase throws', async () => {
    const storage = createMockStorage();
    const failingPhase: PhaseHandler = async () => {
      throw new Error('LLM timeout');
    };
    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', failingPhase],
      ['review', createMockPhase('review')],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation', 'review'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: UNLIMITED_CATCHUP,
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    // Both phases should be marked completed (failed one too)
    expect(storage.state.completedPhases).toContain('consolidation');
    expect(storage.state.completedPhases).toContain('review');

    const journal = storage.journals.get('2026-04-03')!;
    expect(journal).toContain('Phase failed: LLM timeout');
    expect(journal).toContain('## Mock review');
  });
});
