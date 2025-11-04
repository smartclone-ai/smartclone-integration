import type { AIProvider } from './types';

export class TransformersAdapter implements AIProvider {
  private pipe: any | null = null;

  async initialize(modelId: string): Promise<boolean> {
    const { pipeline } = await import('@xenova/transformers');
    this.pipe = await pipeline('text-generation', modelId);
    return true;
  }

  async probe(_modelId: string): Promise<boolean> {
    try {
      const transformers = await import('@xenova/transformers');
      return typeof transformers.pipeline === 'function';
    } catch {
      return false;
    }
  }
}
