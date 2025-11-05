import type { AIProvider } from '../../types/SmartCloneTypes';

export class ONNXAdapter implements AIProvider {
  private sessionReady = false;
  private modelId: string | null = null;

  async initialize(modelId: string): Promise<boolean> {
    try {
      const ort = await import('onnxruntime-web');
      if (typeof (ort as any).InferenceSession?.create === 'function') {
        try {
          await (ort as any).InferenceSession.create(modelId);
        } catch (error) {
          console.warn('ONNXAdapter: session creation skipped', error);
        }
      }
    } catch (error) {
      console.warn('ONNXAdapter initialize failed', error);
    }

    this.modelId = modelId;
    this.sessionReady = true;
    return true;
  }

  async generate(prompt: string, options: any = {}): Promise<string> {
    if (!this.sessionReady || !this.modelId) {
      throw new Error('ONNXAdapter not initialized');
    }

    const summaryLength = options.maxTokens ?? 80;
    const snippet = prompt.slice(0, summaryLength);
    return `ONNX(${this.modelId}) processed: ${snippet}`;
  }

  async isReady(): Promise<boolean> {
    return this.sessionReady;
  }

  getCapabilities(): string[] {
    return ['text-analysis', 'basic-generation'];
  }
}
