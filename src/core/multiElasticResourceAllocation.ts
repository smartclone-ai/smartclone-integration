/**
 * Copyright 2025 Your Name or Your Company
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Hardware-adaptive AI scaling for browser environments
 * Automatically adjusts AI complexity based on detected hardware
 */

// Types for the function
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
}

// Device capability detection interface
interface DeviceCapabilities {
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
  battery?: {
    level: number;
    charging: boolean;
  } | null;
}

/**
 * Detects device capabilities for AI workloads
 */
async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
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
          webgpu: 'gpu' in navigator
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
        charging: batteryManager.charging
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
 * Performs hardware-adaptive AI scaling based on detected capabilities
 * @param options Configuration options
 * @returns Allocation decision with selected models and config
 */
export async function multiElasticResourceAllocation(
  options: ResourceAllocationOptions = {}
): Promise<ResourceAllocation> {
  const {
    taskType = 'inference',
    priority = 'balanced',
    models = {},
  } = options;

  // Detect device capabilities
  const capabilities = await detectDeviceCapabilities();

  // Initialize allocation with defaults
  let allocation: ResourceAllocation = {
    device: 'cpu',
    modelTier: 'small',
    maxBatchSize: 1,
    quantization: '8bit',
    offloadHeavyOps: false,
    splitCompute: false,
    model: null
  };

  // Adjust based on capabilities
  if (capabilities.gpu.supported) {
    allocation.device = 'gpu';
    allocation.modelTier = 'medium';
    allocation.maxBatchSize = 4;

    // If dedicated GPU, we can use larger model
    if (capabilities.gpu.type === 'dedicated') {
      allocation.modelTier = 'large';
      allocation.quantization = '16bit';
      allocation.maxBatchSize = 8;
    }
  }

  if (capabilities.memory > 8) { // >8GB RAM
    allocation.modelTier = 'large';
    allocation.quantization = '16bit';
  }

  if (capabilities.battery && capabilities.battery.level < 0.2 && !capabilities.battery.charging) {
    // Battery saving mode
    allocation.modelTier = 'small';
    allocation.device = 'cpu';
  }

  // Override based on priority
  if (priority === 'performance') {
    allocation.modelTier = allocation.modelTier === 'small' ? 'medium' : 'large';
    allocation.quantization = '16bit';
    allocation.offloadHeavyOps = false;
  } else if (priority === 'quality') {
    allocation.modelTier = 'large';
    allocation.quantization = capabilities.memory > 16 ? '32bit' : '16bit';
    allocation.maxBatchSize = 1; // Focus on quality per inference
  } else if (priority === 'battery') {
    allocation.modelTier = 'small';
    allocation.quantization = '8bit';
    allocation.offloadHeavyOps = true;
    allocation.device = 'cpu'; // CPU might be more efficient for some tasks
  }

  // Select actual model
  allocation.model = models[allocation.modelTier] || null;

  // Determine if we need to split compute between local and remote
  if (
    (allocation.modelTier === 'large' && capabilities.memory < 4) ||
    (allocation.modelTier === 'medium' && capabilities.memory < 2)
  ) {
    allocation.splitCompute = true;
  }

  return allocation;
}
