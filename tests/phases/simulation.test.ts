import { describe, it, expect } from 'vitest';
import { simulation } from '../../src/phases/simulation.js';
import { createTestContext } from './helpers.js';

describe('simulation phase', () => {
  it('returns scenarios', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            scenarios: [
              { title: 'What if npm registry goes down?', type: 'failure', impact: 'Builds fail', mitigation: 'Use lockfile', readiness: 'Ready' },
            ],
            vulnerabilities: [],
            insights: ['Add offline build support'],
          };
        },
      },
    });

    const result = await simulation(ctx);
    expect(result.phase).toBe('simulation');
    expect(result.journal).toContain('## Simulation & Rehearsal');
    expect(result.nightmare).toBeNull();
  });

  it('flags critical vulnerabilities as nightmares', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            scenarios: [],
            vulnerabilities: ['critical: lodash prototype pollution'],
            insights: [],
          };
        },
      },
    });

    const result = await simulation(ctx);
    expect(result.nightmare).toContain('critical');
  });
});
