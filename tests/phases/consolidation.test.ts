import { describe, it, expect } from 'vitest';
import { consolidation } from '../../src/phases/consolidation.js';
import { createTestContext } from './helpers.js';

describe('consolidation phase', () => {
  it('returns a valid PhaseResult', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            activitySummary: 'Worked on tests',
            strengthened: ['project knowledge'],
            stale: [],
            contradictions: [],
            gaps: ['no memory files'],
            insights: ['Start tracking memory'],
          };
        },
      },
    });

    const result = await consolidation(ctx);

    expect(result.phase).toBe('consolidation');
    expect(result.journal).toContain('## Memory Consolidation');
    expect(result.journal).toContain('Worked on tests');
    expect(result.insights).toContain('Start tracking memory');
    expect(result.nightmare).toBeNull();
  });

  it('handles empty LLM response gracefully', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            activitySummary: '',
            strengthened: [],
            stale: [],
            contradictions: [],
            gaps: [],
            insights: [],
          };
        },
      },
    });

    const result = await consolidation(ctx);
    expect(result.phase).toBe('consolidation');
    expect(result.journal).toContain('(no activity detected)');
  });
});
