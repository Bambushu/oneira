import { describe, it, expect } from 'vitest';
import { hypothesis } from '../../src/phases/hypothesis.js';
import { createTestContext } from './helpers.js';

describe('hypothesis phase', () => {
  it('returns testable hypotheses', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            hypotheses: [
              { question: 'I wonder if tests run faster on Tuesdays', evidence: 'commit patterns', experiment: 'Track CI times', timeline: '2 weeks' },
            ],
            insights: ['CI patterns worth investigating'],
          };
        },
      },
    });

    const result = await hypothesis(ctx);
    expect(result.phase).toBe('hypothesis');
    expect(result.journal).toContain('## Hypotheses');
    expect(result.journal).toContain('I wonder if');
  });
});
