import { describe, it, expect } from 'vitest';
import { createAdapter } from '../../src/adapters/index.js';

describe('createAdapter', () => {
  it('throws for unknown provider', async () => {
    await expect(createAdapter('unknown-provider')).rejects.toThrow('Unknown provider');
  });

  it('throws when anthropic API key is missing', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await expect(createAdapter('anthropic')).rejects.toThrow('ANTHROPIC_API_KEY');
    } finally {
      if (originalKey) process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });
});
