/*
 * Copyright 2025 SmartClone Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  detectEnhancedCapabilities,
  type DeviceCapabilities,
  type EnhancedDeviceCapabilities
} from '../utils/deviceDetection';
import type { MultiElasticRecommendation } from '../types/SmartCloneTypes';
export type { MultiElasticRecommendation } from '../types/SmartCloneTypes';

/**
 * Resource allocation options for AI workloads
 */
export interface ResourceAllocationOptions {
  taskType?: 'inference' | 'embedding' | 'training';
  priority?: 'performance' | 'battery' | 'quality' | 'balanced';
  models?: Record<string, any>;
}

export interface ResourceAllocation {
  device: 'cpu' | 'gpu' | 'webgpu' | 'webgl';
  modelTier: 'small' | 'medium' | 'large';
  quantization: '32bit' | '16bit' | '8bit' | '4bit';
  maxBatchSize: number;
  offloadHeavyOps: boolean;
  splitCompute: boolean;
  model: any | null;
  technology?: string;
  modelId?: string;
  benchmarkMs?: number | null;
  confidence?: number;
}

type TechnologyConfig = {
  priority: number;
  requires: string[];
  models: string[];
  capabilities: string[];
};

/**
 * Multi-framework technology selector with capability-aware fallbacks.
 */
export class MultiElasticResourceAllocation {
  private technologyStack: Record<string, TechnologyConfig> = {
    transformers: {
      priority: 1,
      requires: ['webassembly'],
      models: ['Xenova/gpt2', 'Xenova/distilgpt2'],
      capabilities: ['text-generation', 'conversation']
    },
    webllm: {
      priority: 2,
      requires: ['webgpu'],
      models: ['Llama-3.1-8B-Instruct-q4f16_1', 'Phi-3-mini-4k-instruct-q4f16_1'],
      capabilities: ['text-generation', 'conversation', 'reasoning']
    },
    tensorflow: {
      priority: 3,
      requires: ['webgl2', 'webassembly'],
      models: ['universal-sentence-encoder', 'mobilenet'],
      capabilities: ['text-analysis', 'classification']
    },
    onnx: {
      priority: 4,
      requires: ['webassembly'],
      models: ['distilbert-base-uncased', 'gpt2'],
      capabilities: ['text-analysis', 'basic-generation']
    }
  };

  private benchmarks: Map<string, number> = new Map();

  getBenchmark(technology: string): number | undefined {
    return this.benchmarks.get(technology);
  }

  /**
   * Select the optimal AI technology for the provided query and device capabilities.
   */
  async selectOptimalTechnology(
    query: string,
    capabilities: DeviceCapabilities | EnhancedDeviceCapabilities,
    requiredCapability: 'conversation' | 'analysis' | 'classification' = 'conversation'
  ): Promise<MultiElasticRecommendation> {
    const enhancedCapabilities = this.normalizeCapabilities(capabilities);

    const suitableTechs = Object.entries(this.technologyStack)
      .filter(([, config]) => config.capabilities.includes(requiredCapability))
      .sort(([, a], [, b]) => a.priority - b.priority);

    for (const [tech, config] of suitableTechs) {
      if (!this.meetsRequirements(enhancedCapabilities, config.requires)) {
        continue;
      }

      const modelId = config.models[0];
      const success = await this.benchmarkTechnology(tech, modelId);
      if (success) {
        const benchmark = this.benchmarks.get(tech) ?? null;
        return {
          technology: tech,
          model: modelId,
          capability: requiredCapability,
          fallbacks: config.models.slice(1),
          confidence: this.calculateConfidence(config.priority, benchmark)
        };
      }
    }

    return {
      technology: 'cloud',
      model: 'api-fallback',
      capability: requiredCapability,
      fallbacks: [],
      confidence: 0
    };
  }

  private normalizeCapabilities(
    capabilities: DeviceCapabilities | EnhancedDeviceCapabilities
  ): EnhancedDeviceCapabilities {
    if ('webassembly' in capabilities) {
      return capabilities as EnhancedDeviceCapabilities;
    }

    const memoryGb = typeof capabilities.memory === 'number' ? capabilities.memory : 4;
    return {
      ...(capabilities as DeviceCapabilities),
      webgpu: false,
      webgl2: Boolean(capabilities?.gpu?.webgl2),
      webassembly: typeof WebAssembly !== 'undefined',
      tensorflowjs: false,
      onnxjs: false,
      transformersjs: false,
      memoryGb,
      cpuCores: capabilities.cpu?.cores ?? 1
    };
  }

  private meetsRequirements(
    capabilities: EnhancedDeviceCapabilities,
    requirements: string[]
  ): boolean {
    return requirements.every((requirement) => Boolean((capabilities as any)[requirement]));
  }

  private async benchmarkTechnology(tech: string, modelId: string): Promise<boolean> {
    const startTime = this.now();

    try {
      switch (tech) {
        case 'transformers':
          await this.testTransformersJS(modelId);
          break;
        case 'tensorflow':
          await this.testTensorFlowJS();
          break;
        case 'onnx':
          await this.testONNXJS();
          break;
        case 'webllm':
          await this.testWebLLM(modelId);
          break;
        default:
          return false;
      }

      const loadTime = this.now() - startTime;
      this.benchmarks.set(tech, loadTime);
      console.log(`✅ ${tech} benchmark: ${loadTime.toFixed(0)}ms`);

      return loadTime < 30000;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${tech} benchmark failed:`, message);
      return false;
    }
  }

  private calculateConfidence(priority: number, benchmark: number | null): number {
    const base = Math.max(0.1, 1 - (benchmark ?? 30000) / 60000);
    const priorityBoost = Math.max(0, (5 - priority) * 0.1);
    return Math.min(1, Number((base + priorityBoost).toFixed(2)));
  }

  private async testTransformersJS(modelId: string) {
    const { pipeline } = await import('@xenova/transformers');
    return pipeline('text-generation', modelId, { quantized: true });
  }

  private async testTensorFlowJS() {
    const tf = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-backend-webgl');
    if (typeof tf.setBackend === 'function') {
      await tf.setBackend('webgl');
    }
    if (typeof tf.ready === 'function') {
      await tf.ready();
    }
    return tf;
  }

  private async testONNXJS() {
    const ort = await import('onnxruntime-web');
    if (!(ort as any).InferenceSession) {
      throw new Error('onnxruntime-web unavailable');
    }
    return ort;
  }

  private async testWebLLM(modelId: string) {
    const webllm = await import('@mlc-ai/web-llm');
    if (typeof (webllm as any).CreateMLCEngine !== 'function') {
      throw new Error('WebLLM runtime unavailable');
    }
    if (typeof (webllm as any).CreateMLCEngine === 'function') {
      await (webllm as any).CreateMLCEngine({ model: modelId, logLevel: 'error' });
    }
    return webllm;
  }

  private now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }

    return Date.now();
  }
}

const globalAllocator = new MultiElasticResourceAllocation();

/**
 * Performs hardware-adaptive AI scaling based on detected capabilities.
 */
export async function multiElasticResourceAllocation(
  options: ResourceAllocationOptions = {},
  capabilities?: EnhancedDeviceCapabilities
): Promise<ResourceAllocation> {
  const {
    taskType = 'inference',
    priority = 'balanced',
    models = {}
  } = options;

  const enhancedCapabilities = capabilities ?? await detectEnhancedCapabilities();
  const recommendation = await globalAllocator.selectOptimalTechnology(
    taskType,
    enhancedCapabilities,
    taskType === 'inference' ? 'conversation' : 'analysis'
  );

  const memoryGb = enhancedCapabilities.memoryGb ?? 4;
  const cpuCores = enhancedCapabilities.cpuCores ?? 2;

  const device: ResourceAllocation['device'] = enhancedCapabilities.webgpu
    ? 'webgpu'
    : enhancedCapabilities.webgl2
      ? 'webgl'
      : enhancedCapabilities.gpu?.supported
        ? 'gpu'
        : 'cpu';

  let modelTier: ResourceAllocation['modelTier'] = memoryGb >= 12 ? 'large' : memoryGb >= 6 ? 'medium' : 'small';
  let quantization: ResourceAllocation['quantization'] = modelTier === 'large' ? '16bit' : '8bit';

  if (priority === 'performance') {
    modelTier = modelTier === 'small' ? 'medium' : 'large';
    quantization = '16bit';
  } else if (priority === 'quality') {
    quantization = memoryGb > 16 ? '32bit' : '16bit';
  } else if (priority === 'battery') {
    modelTier = 'small';
    quantization = '8bit';
  }

  const maxBatchSize = Math.max(1, Math.round(cpuCores / (priority === 'performance' ? 1 : 2)));
  const offloadHeavyOps = !enhancedCapabilities.webgpu && !enhancedCapabilities.webgl2;
  const splitCompute = modelTier === 'large' && memoryGb < 8;

  return {
    device,
    modelTier,
    quantization,
    maxBatchSize,
    offloadHeavyOps,
    splitCompute,
    model: models[modelTier] ?? null,
    technology: recommendation.technology,
    modelId: recommendation.model,
    benchmarkMs: globalAllocator.getBenchmark(recommendation.technology) ?? null,
    confidence: recommendation.confidence
  };
}
