import { describe, it, expect } from 'vitest';
import { drafts } from '../../src/phases/drafts.js';
import { createTestContext } from './helpers.js';

describe('drafts phase', () => {
  it('returns draft artifacts', async () => {
    const ctx = createTestContext({
      llm: {
        async complete() { return '{}'; },
        async completeJSON() {
          return {
            drafts: [
              { type: 'pr', name: 'feat-auth', description: 'PR for auth', content: '## Summary\nAdds auth' },
            ],
            insights: ['PR ready for review'],
          };
        },
      },
    });

    const result = await drafts(ctx);
    expect(result.phase).toBe('drafts');
    expect(result.journal).toContain('## Draft Factory');
    expect(result.metadata.drafts).toHaveLength(1);
  });
});
