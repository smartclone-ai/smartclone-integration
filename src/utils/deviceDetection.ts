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
