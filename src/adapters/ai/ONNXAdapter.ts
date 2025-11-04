import type { AIProvider } from './types';

export class ONNXAdapter implements AIProvider {
  private session: any | null = null;

  async initialize(modelId: string): Promise<boolean> {
    const ort = await import('onnxruntime-web');
    if (typeof (ort as any).InferenceSession?.create !== 'function') {
      throw new Error('ONNX runtime does not expose InferenceSession.create');
    }

    this.session = await (ort as any).InferenceSession.create(`/models/${modelId}.onnx`);
    return true;
  }

  async probe(_modelId: string): Promise<boolean> {
    try {
      const ort = await import('onnxruntime-web');
      return typeof (ort as any).InferenceSession?.create === 'function';
    } catch {
      return false;
    }
  }
}
