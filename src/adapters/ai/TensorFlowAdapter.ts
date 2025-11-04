import type { AIProvider } from './types';

export class TensorFlowAdapter implements AIProvider {
  private model: any | null = null;

  async initialize(modelId: string): Promise<boolean> {
    const tf = await import('@tensorflow/tfjs');
    if (typeof tf.ready === 'function') {
      await tf.ready();
    }

    this.model = await (tf as any).loadLayersModel(`/models/${modelId}`);
    return true;
  }

  async probe(modelId: string): Promise<boolean> {
    try {
      const tf = await import('@tensorflow/tfjs');
      if (typeof tf.ready === 'function') {
        await tf.ready();
      }

      if (typeof (tf as any).io?.getLoadHandlers === 'function') {
        const handlers = (tf as any).io.getLoadHandlers(`/models/${modelId}`);
        if (handlers.length > 0) {
          return true;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
