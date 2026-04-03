import type { PhaseContext, LLMAdapter, MemoryStore, JournalEntry, OneiraConfig } from '../../src/types.js';

export function createTestContext(overrides?: Partial<PhaseContext>): PhaseContext {
  const mockLLM: LLMAdapter = {
    async complete(prompt: string) {
      return 'Mock LLM response for: ' + prompt.slice(0, 50);
    },
    async completeJSON<T>(prompt: string) {
      return {} as T;
    },
  };

  const mockMemory: MemoryStore = {
    async list() { return []; },
    async read() { return null; },
  };

  const config: OneiraConfig = {
    provider: 'anthropic',
    phases: ['consolidation', 'synthesis', 'hypothesis', 'simulation', 'experimentation', 'drafts', 'review'],
    schedule: { start: '22:00', end: '06:00', timezone: 'Europe/Amsterdam' },
    storage: 'file',
    lucid: null,
    project: 'test-project',
  };

  return {
    config,
    date: '2026-04-03',
    memory: mockMemory,
    journal: [],
    llm: mockLLM,
    lucid: null,
    ...overrides,
  };
}
