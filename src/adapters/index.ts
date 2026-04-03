import type { LLMAdapter } from '../types.js';

export async function createAdapter(provider: string): Promise<LLMAdapter> {
  switch (provider) {
    case 'anthropic':
      return createAnthropicAdapter();
    default:
      throw new Error(`Unknown provider: "${provider}". Supported: anthropic`);
  }
}

async function createAnthropicAdapter(): Promise<LLMAdapter> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not set. Set it in your environment or run `oneira init`.'
    );
  }

  try {
    const { AnthropicAdapter } = await import('./anthropic.js');
    return new AnthropicAdapter(apiKey);
  } catch (e) {
    throw new Error(
      'Failed to load @anthropic-ai/sdk. Install it: npm install @anthropic-ai/sdk'
    );
  }
}
