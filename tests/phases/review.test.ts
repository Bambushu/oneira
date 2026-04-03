import { describe, it, expect } from 'vitest';
import { review } from '../../src/phases/review.js';
import { createTestContext } from './helpers.js';

describe('review phase', () => {
  it('returns quality assessment with priorities', async () => {
    const ctx = createTestContext({
      journal: [
        { phase: 'consolidation' as const, content: 'Worked on tests', insights: ['improve coverage'], nightmare: null, metadata: {} },
      ],
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            grades: { codeQuality: 'Good', dreamInsights: 'Mostly novel', consistency: 'No contradictions' },
            issues: [],
            priorities: ['Improve test coverage', 'Update docs', 'Review PRs'],
            qualityScore: 7,
            insights: ['Dream cycle was productive'],
          };
        },
      },
    });

    const result = await review(ctx);
    expect(result.phase).toBe('review');
    expect(result.journal).toContain('## Self-Review');
    expect(result.journal).toContain('7/10');
    expect(result.metadata.priorities).toHaveLength(3);
    expect(result.nightmare).toBeNull();
  });

  it('flags critical issues as nightmares', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            grades: { codeQuality: 'Poor', dreamInsights: 'N/A', consistency: 'N/A' },
            issues: [{ severity: 'critical', description: 'SQL injection in auth', suggestion: 'Parameterize queries' }],
            priorities: ['Fix SQL injection immediately'],
            qualityScore: 2,
            insights: [],
          };
        },
      },
    });

    const result = await review(ctx);
    expect(result.nightmare).toContain('SQL injection');
  });
});
