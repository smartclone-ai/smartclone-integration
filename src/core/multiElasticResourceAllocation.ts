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
  type EnhancedDeviceCapabilities
} from '../utils/deviceDetection';
import { TensorFlowAdapter } from '../adapters/ai/TensorFlowAdapter';
import { ONNXAdapter } from '../adapters/ai/ONNXAdapter';
import { TransformersAdapter } from '../adapters/ai/TransformersAdapter';

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
  score?: number;
}

export interface TechnologySelection {
  technology: string;
  model: string;
  score: number;
  latencyMs: number | null;
}

type TechnologyConfig = {
  priority: number;
  requires: string[];
  models: string[];
};

/**
 * Multi-framework technology selector with capability-aware fallbacks.
 */
export class MultiElasticResourceAllocation {
  private technologyStack: Record<string, TechnologyConfig> = {
    webllm: {
      priority: 1,
      requires: ['webgpu'],
      models: ['Llama-3.1-8B-Instruct-q4f16_1', 'Phi-3-mini-4k-instruct-q4f16_1']
    },
    tensorflowjs: {
      priority: 2,
      requires: ['webgl2'],
      models: ['universal-sentence-encoder', 'mobilenet']
    },
    onnxjs: {
      priority: 3,
      requires: ['webassembly'],
      models: ['distilbert-base-uncased', 'gpt2']
    },
    transformersjs: {
      priority: 4,
      requires: ['webassembly'],
      models: ['Xenova/distilbert-base-uncased-finetuned-sst-2-english']
    }
  };

  private benchmarks: Map<string, number> = new Map();

  /**
   * Select the optimal AI technology for the provided query and device capabilities.
   */
  async selectOptimalTechnology(
    query: string,
    capabilities: EnhancedDeviceCapabilities
  ): Promise<TechnologySelection> {
    const evaluated: TechnologySelection[] = [];

    for (const [tech, config] of Object.entries(this.technologyStack)) {
      if (!this.meetsRequirements(capabilities, config.requires)) {
        continue;
      }

      const modelId = config.models[0];
      const result = await this.testTechnology(tech, modelId);
      if (!result.success) {
        continue;
      }

      const latency = result.latencyMs;
      if (latency != null) {
        this.benchmarks.set(tech, latency);
      }

      const score = this.calculateScore(tech, config.priority, latency);
      evaluated.push({
        technology: tech,
        model: modelId,
        score,
        latencyMs: latency
      });
    }

    if (evaluated.length === 0) {
      return {
        technology: 'cloud',
        model: 'api-fallback',
        score: 0,
        latencyMs: null
      };
    }

    evaluated.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const latencyA = a.latencyMs ?? Number.POSITIVE_INFINITY;
      const latencyB = b.latencyMs ?? Number.POSITIVE_INFINITY;
      return latencyA - latencyB;
    });

    return evaluated[0];
  }

  private meetsRequirements(
    capabilities: EnhancedDeviceCapabilities,
    requirements: string[]
  ): boolean {
    return requirements.every((requirement) => Boolean((capabilities as any)[requirement]));
  }

  private async testTechnology(
    tech: string,
    modelId: string
  ): Promise<{ success: boolean; latencyMs: number | null }> {
    const start = this.now();

    try {
      switch (tech) {
        case 'webllm': {
          const webllm = await import('@mlc-ai/web-llm');
          if (typeof webllm !== 'object') {
            throw new Error('WebLLM runtime unavailable');
          }
          break;
        }
        case 'tensorflowjs': {
          const adapter = new TensorFlowAdapter();
          await adapter.probe(modelId);
          break;
        }
        case 'onnxjs': {
          const adapter = new ONNXAdapter();
          await adapter.probe(modelId);
          break;
        }
        case 'transformersjs': {
          const adapter = new TransformersAdapter();
          await adapter.probe(modelId);
          break;
        }
        default:
          return { success: false, latencyMs: null };
      }

      const latency = this.now() - start;
      return { success: true, latencyMs: latency };
    } catch (error) {
      console.warn(`[MultiElasticResourceAllocation] ${tech} probe failed`, error);
      return { success: false, latencyMs: null };
    }
  }

  private calculateScore(technology: string, priority: number, latencyMs: number | null): number {
    const priorityWeight = Math.max(0, 5 - priority) * 100;
    const latencyWeight = latencyMs == null ? 0 : Math.max(0, 500 - latencyMs);
    const historicLatency = this.benchmarks.get(technology);
    const historicBoost = historicLatency == null ? 0 : Math.max(0, 500 - historicLatency) * 0.2;
    return priorityWeight + latencyWeight + historicBoost;
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
    enhancedCapabilities
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
    benchmarkMs: recommendation.latencyMs,
    score: recommendation.score
  };
}
