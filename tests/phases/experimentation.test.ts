import { describe, it, expect, vi } from 'vitest';
import { createTestContext } from './helpers.js';

vi.mock('../../src/phases/gather.js', () => ({
  gatherConfigFiles: () => '(no config/prompt files found)',
  truncateContext: (text: string) => text,
}));

describe('experimentation phase', () => {
  it('gracefully handles no config files', async () => {
    // Import after mock is set up
    const { experimentation } = await import('../../src/phases/experimentation.js');
    const ctx = createTestContext();
    const result = await experimentation(ctx);
    expect(result.phase).toBe('experimentation');
    expect(result.journal).toContain('No config or prompt files found');
    expect(result.metadata.skipped).toBe(true);
  });
});
