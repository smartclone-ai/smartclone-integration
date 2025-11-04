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

/**
 * Utilities for detecting device capabilities
 */

export interface DeviceCapabilities {
  cpu: {
    cores: number;
    supported: boolean;
  };
  memory: number;
  gpu: {
    supported: boolean;
    type?: 'integrated' | 'dedicated' | 'none';
    renderer?: string;
    webgl2?: boolean;
    webgpu?: boolean;
  };
  storage?: {
    total: number;
    available: number;
  };
  network?: {
    type: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  battery?: {
    level: number;
    charging: boolean;
    chargingTime?: number;
    dischargingTime?: number;
  } | null;
}

export interface EnhancedDeviceCapabilities extends DeviceCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  webassembly: boolean;
  tensorflowjs: boolean;
  onnxjs: boolean;
  transformersjs: boolean;
  memoryGb: number;
  cpuCores: number;
}

/**
 * Detects device capabilities for AI workloads
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  // Detect CPU
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1;

  // Estimate memory (simplified)
  const estimatedMemory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator ?
    (navigator as any).deviceMemory || 4 : 4;

  // Detect GPU (simplified)
  let gpu: {
    supported: boolean;
    type?: 'integrated' | 'dedicated' | 'none';
    renderer?: string;
    webgl2?: boolean;
    webgpu?: boolean;
  } = { supported: false };

  // Check if in browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl2') ||
                canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

      if (gl) {
        gpu = {
          supported: true,
          type: 'integrated', // Default assumption
          webgl2: !!canvas.getContext('webgl2'),
          webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator
        };

        // Try to get renderer info
        try {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            gpu.renderer = renderer;

            // Check for keywords indicating dedicated GPU
            if (/nvidia|geforce|rtx|gtx/i.test(renderer) ||
                /amd|radeon|rx/i.test(renderer) ||
                /intel\s+arc/i.test(renderer)) {
              gpu.type = 'dedicated';
            }
          }
        } catch (e) {
          console.warn('Could not detect GPU details', e);
        }
      }
    } catch (e) {
      console.warn('Error detecting GPU', e);
    }
  }

  // Detect battery if available
  let battery = null;
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const batteryManager = await (navigator as any).getBattery();
      battery = {
        level: batteryManager.level,
        charging: batteryManager.charging,
        chargingTime: batteryManager.chargingTime,
        dischargingTime: batteryManager.dischargingTime
      };
    } catch (e) {
      console.warn('Battery detection failed', e);
    }
  }

  return {
    cpu: {
      cores: cpuCores,
      supported: true
    },
    memory: estimatedMemory,
    gpu,
    battery
  };
}

/**
 * Enhanced detection that also probes individual AI framework capabilities.
 */
export async function detectEnhancedCapabilities(): Promise<EnhancedDeviceCapabilities> {
  const baseline = await detectDeviceCapabilities();
  const [webgpu, webgl2, webassembly, tensorflowjs, onnxjs, transformersjs] = await Promise.all([
    testWebGPU(),
    testWebGL2(),
    testWebAssembly(),
    testTensorFlowJS(),
    testONNXJS(),
    testTransformersJS()
  ]);

  const memoryGb = estimateMemory(baseline);
  const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : baseline.cpu.cores || 4;

  return {
    ...baseline,
    webgpu,
    webgl2,
    webassembly,
    tensorflowjs,
    onnxjs,
    transformersjs,
    memoryGb,
    cpuCores
  };
}

async function testWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return 'gpu' in navigator;
}

async function testWebGL2(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

async function testWebAssembly(): Promise<boolean> {
  return typeof WebAssembly === 'object';
}

async function testTensorFlowJS(): Promise<boolean> {
  try {
    const tf = await import('@tensorflow/tfjs');
    if (typeof tf.ready === 'function') {
      await tf.ready();
    }
    return true;
  } catch {
    return false;
  }
}

async function testONNXJS(): Promise<boolean> {
  try {
    await import('onnxruntime-web');
    return true;
  } catch {
    return false;
  }
}

async function testTransformersJS(): Promise<boolean> {
  try {
    await import('@xenova/transformers');
    return true;
  } catch {
    return false;
  }
}

function estimateMemory(baseline: DeviceCapabilities): number {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    return (navigator as any).deviceMemory || 4;
  }

  return baseline.memory || 4;
}
