import { describe, it, expect } from 'vitest';
import { synthesis } from '../../src/phases/synthesis.js';
import { createTestContext } from './helpers.js';

describe('synthesis phase', () => {
  it('returns creative pairings', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            pairs: [
              { a: 'auth', b: 'logging', idea: 'Auth event stream', novelty: 7, feasibility: 8, combined: 15, keep: true },
            ],
            insights: ['Consider event-driven auth'],
          };
        },
      },
    });

    const result = await synthesis(ctx);
    expect(result.phase).toBe('synthesis');
    expect(result.journal).toContain('## Creative Synthesis');
    expect(result.journal).toContain('auth');
  });
});
