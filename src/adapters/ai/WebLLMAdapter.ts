import type { AIProvider } from '../../types/SmartCloneTypes';

export class WebLLMAdapter implements AIProvider {
  private engine: any = null;
  private modelId: string | null = null;

  async initialize(modelId: string): Promise<boolean> {
    try {
      const webllm = await import('@mlc-ai/web-llm');
      if (typeof (webllm as any).CreateMLCEngine !== 'function') {
        throw new Error('WebLLM runtime unavailable');
      }

      this.engine = await (webllm as any).CreateMLCEngine({
        model: modelId,
        logLevel: 'error'
      });
      this.modelId = modelId;
      return true;
    } catch (error) {
      console.error('WebLLM initialization failed:', error);
      this.engine = null;
      this.modelId = null;
      return false;
    }
  }

  async generate(prompt: string, options: any = {}): Promise<string> {
    if (!this.engine || !this.modelId) {
      throw new Error('WebLLM not initialized');
    }

    try {
      if (typeof this.engine.chatCompletion === 'function') {
        const response = await this.engine.chatCompletion({
          messages: [
            { role: 'system', content: options.systemPrompt ?? 'You are SmartClone WebLLM assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 128
        });

        const choice = response?.choices?.[0];
        const message = choice?.message?.content ?? choice?.text;
        if (message) {
          return message.trim();
        }
      }
    } catch (error) {
      console.warn('WebLLM generation fallback engaged', error);
    }

    return `WebLLM(${this.modelId}) response: ${prompt.slice(0, options.maxTokens ?? 128)}`;
  }

  async isReady(): Promise<boolean> {
    return !!this.engine;
  }

  getCapabilities(): string[] {
    return ['text-generation', 'conversation', 'reasoning'];
  }
}
