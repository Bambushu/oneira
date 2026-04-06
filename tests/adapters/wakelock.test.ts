import { describe, it, expect, vi } from 'vitest';
import { NoopWakelockAdapter } from '../../src/adapters/wakelock-noop.js';
import { MacOSWakelockAdapter } from '../../src/adapters/wakelock-macos.js';
import { Orchestrator } from '../../src/orchestrator.js';
import type {
  WakelockAdapter,
  WakelockHandle,
  PhaseHandler,
  PhaseId,
  LLMAdapter,
  MemoryStore,
  DreamState,
  StorageAdapter,
} from '../../src/types.js';

describe('NoopWakelockAdapter', () => {
  it('isSupported returns false', () => {
    const adapter = new NoopWakelockAdapter();
    expect(adapter.isSupported()).toBe(false);
  });

  it('acquire returns inactive handle', async () => {
    const adapter = new NoopWakelockAdapter();
    const handle = await adapter.acquire(3600);
    expect(handle.isActive()).toBe(false);
    await handle.release(); // should not throw
  });
});

describe('MacOSWakelockAdapter', () => {
  it('isSupported returns true on darwin', () => {
    const adapter = new MacOSWakelockAdapter();
    if (process.platform === 'darwin') {
      expect(adapter.isSupported()).toBe(true);
    } else {
      expect(adapter.isSupported()).toBe(false);
    }
  });
});

describe('Orchestrator with wakelock', () => {
  function createMockStorage(): StorageAdapter & { state: DreamState; journals: Map<string, string> } {
    const state: DreamState = {
      currentDreamDate: null,
      completedPhases: [],
      lastDreamAt: null,
      lucidPrompt: null,
    };
    const journals = new Map<string, string>();
    return {
      state,
      journals,
      async readState() { return { ...state }; },
      async writeState(s: DreamState) { Object.assign(state, s); },
      async readJournal(date: string) { return journals.get(date) || null; },
      async writeJournal(date: string, content: string) { journals.set(date, content); },
      async listJournals() { return [...journals.keys()]; },
      async writeDraft() {},
    };
  }

  const mockLLM: LLMAdapter = {
    async complete() { return 'mock'; },
    async completeJSON<T>() { return {} as T; },
  };

  const mockMemory: MemoryStore = {
    async list() { return []; },
    async read() { return null; },
  };

  it('acquires and releases wakelock during run', async () => {
    const acquireSpy = vi.fn().mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
      isActive: vi.fn().mockReturnValue(true),
    });

    const mockWakelock: WakelockAdapter = {
      acquire: acquireSpy,
      isSupported: () => true,
    };

    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', async () => ({
        phase: 'consolidation' as PhaseId,
        journal: '## Memory Consolidation\n\nDone',
        insights: [],
        nightmare: null,
        metadata: {},
      })],
    ]);

    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: { policy: 'none', maxPhasesPerHeartbeat: 1, chainablePairs: [] },
        wakelock: 'auto',
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage: createMockStorage(),
      llm: mockLLM,
      memory: mockMemory,
      phases,
      wakelock: mockWakelock,
      now: new Date('2026-04-03T22:30:00'),
    });

    await orchestrator.run();

    // Wakelock should have been acquired
    expect(acquireSpy).toHaveBeenCalledOnce();
    // Duration should be ~8h + 15min margin = 29700s
    expect(acquireSpy.mock.calls[0][0]).toBe(29700);

    // And released
    const handle = await acquireSpy.mock.results[0].value;
    expect(handle.release).toHaveBeenCalledOnce();
  });

  it('continues without wakelock if acquire fails', async () => {
    const mockWakelock: WakelockAdapter = {
      acquire: vi.fn().mockRejectedValue(new Error('caffeinate not found')),
      isSupported: () => true,
    };

    const phases = new Map<PhaseId, PhaseHandler>([
      ['consolidation', async () => ({
        phase: 'consolidation' as PhaseId,
        journal: '## Memory Consolidation\n\nDone',
        insights: [],
        nightmare: null,
        metadata: {},
      })],
    ]);

    const storage = createMockStorage();
    const orchestrator = new Orchestrator({
      config: {
        provider: 'anthropic',
        phases: ['consolidation'],
        schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
        catchUp: { policy: 'none', maxPhasesPerHeartbeat: 1, chainablePairs: [] },
        wakelock: 'auto',
        storage: 'file',
        lucid: null,
        project: 'test',
      },
      storage,
      llm: mockLLM,
      memory: mockMemory,
      phases,
      wakelock: mockWakelock,
      now: new Date('2026-04-03T22:30:00'),
    });

    // Should not throw
    await orchestrator.run();

    // Dream should still have run
    expect(storage.state.completedPhases).toContain('consolidation');
  });
});
