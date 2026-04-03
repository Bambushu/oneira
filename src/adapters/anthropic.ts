import type { LLMAdapter, LLMOptions } from '../types.js';

export class AnthropicAdapter implements LLMAdapter {
  private clientPromise: Promise<any>;

  constructor(apiKey: string) {
    this.clientPromise = this.initClient(apiKey);
  }

  private async initClient(apiKey: string): Promise<any> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    return new Anthropic({ apiKey });
  }

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    const client = await this.clientPromise;

    const response = await client.messages.create({
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    if (block.type === 'text') return block.text;
    throw new Error('Unexpected response type from Anthropic API');
  }

  async completeJSON<T>(
    prompt: string,
    schema: Record<string, unknown>,
    options?: LLMOptions
  ): Promise<T> {
    const jsonPrompt = `${prompt}\n\nRespond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\n\nNo markdown, no explanation, just the JSON object.`;
    const response = await this.complete(jsonPrompt, options);

    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${response.slice(0, 200)}`);
    }
  }
}
