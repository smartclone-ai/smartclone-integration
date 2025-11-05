import type { AIProvider } from '../../types/SmartCloneTypes';

export class TransformersJSAdapter implements AIProvider {
  private pipeline: any = null;

  async initialize(modelId: string): Promise<boolean> {
    try {
      const { pipeline } = await import('@xenova/transformers');

      this.pipeline = await pipeline('text-generation', modelId, {
        quantized: true,
        progress_callback: (progress: any) => {
          console.log(`📥 Loading ${modelId}:`, progress.status);
        }
      });

      return true;
    } catch (error) {
      console.error('TransformersJS initialization failed:', error);
      return false;
    }
  }

  async generate(prompt: string, options: any = {}): Promise<string> {
    if (!this.pipeline) throw new Error('TransformersJS not initialized');

    const result = await this.pipeline(prompt, {
      max_new_tokens: options.maxTokens || 100,
      temperature: options.temperature || 0.7,
      do_sample: true,
      pad_token_id: 50256
    });

    const fullText = result[0].generated_text;
    return fullText.slice(prompt.length).trim();
  }

  async isReady(): Promise<boolean> {
    return !!this.pipeline;
  }

  getCapabilities(): string[] {
    return ['text-generation', 'conversation'];
  }
}
