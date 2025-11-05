import { MultiElasticResourceAllocation } from './core/multiElasticResourceAllocation';
import type { AIProvider } from './types/SmartCloneTypes';
import { detectEnhancedCapabilities } from './utils/deviceDetection';

export class SmartCloneIntegration {
  private aiProviders = new Map<string, AIProvider>();
  private resourceAllocation = new MultiElasticResourceAllocation();

  async initializeAI(requiredCapability: 'conversation' | 'analysis' = 'conversation') {
    const capabilities = await detectEnhancedCapabilities();
    const recommendation = await this.resourceAllocation
      .selectOptimalTechnology('test', capabilities, requiredCapability);

    console.log('🎯 SmartClone AI recommendation:', recommendation);

    if (recommendation.technology === 'cloud') {
      throw new Error('No compatible on-device AI technology available');
    }

    const provider = await this.createProvider(recommendation.technology);
    const success = await provider.initialize(recommendation.model);

    if (success && (await provider.isReady())) {
      this.aiProviders.set('active', provider);
      console.log(`✅ SmartClone AI ready: ${recommendation.technology}`);
      return provider;
    }

    for (const fallbackModel of recommendation.fallbacks || []) {
      const fallbackSuccess = await provider.initialize(fallbackModel);
      if (fallbackSuccess && (await provider.isReady())) {
        this.aiProviders.set('active', provider);
        console.log(`✅ SmartClone AI ready with fallback: ${fallbackModel}`);
        return provider;
      }
    }

    throw new Error('All AI initialization attempts failed');
  }

  private async createProvider(technology: string): Promise<AIProvider> {
    switch (technology) {
      case 'transformers':
        return new (await import('./adapters/ai/TransformersJSAdapter')).TransformersJSAdapter();
      case 'tensorflow':
        return new (await import('./adapters/ai/TensorFlowAdapter')).TensorFlowAdapter();
      case 'onnx':
        return new (await import('./adapters/ai/ONNXAdapter')).ONNXAdapter();
      case 'webllm':
        return new (await import('./adapters/ai/WebLLMAdapter')).WebLLMAdapter();
      default:
        throw new Error(`Unsupported AI technology: ${technology}`);
    }
  }

  async generateResponse(prompt: string, options?: any): Promise<string> {
    const activeProvider = this.aiProviders.get('active');
    if (!activeProvider) {
      throw new Error('No AI provider initialized');
    }

    return activeProvider.generate(prompt, options);
  }
}
