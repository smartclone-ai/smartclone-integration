import type { AIProvider } from '../../types/SmartCloneTypes';

export class TransformersAdapter implements AIProvider {
  private pipe: any | null = null;
  private modelId: string | null = null;

  async initialize(modelId: string): Promise<boolean> {
    try {
      const { pipeline } = await import('@xenova/transformers');
      this.pipe = await pipeline('text-generation', modelId, { quantized: true });
    } catch (error) {
      console.warn('TransformersAdapter initialize failed', error);
    }

    this.modelId = modelId;
    return true;
  }

  async generate(prompt: string, options: any = {}): Promise<string> {
    if (!this.pipe || !this.modelId) {
      throw new Error('TransformersAdapter not initialized');
    }

    const result = await this.pipe(prompt, {
      max_new_tokens: options.maxTokens ?? 64,
      temperature: options.temperature ?? 0.7,
      do_sample: true
    });

    const generated = result[0]?.generated_text ?? '';
    return generated.slice(prompt.length).trim();
  }

  async isReady(): Promise<boolean> {
    return Boolean(this.pipe);
  }

  getCapabilities(): string[] {
    return ['text-generation'];
  }
}
