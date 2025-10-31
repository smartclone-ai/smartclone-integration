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
 * Progressive AI enhancement based on device capabilities
 * Gradually activates AI features based on available resources
 */

// Types
export interface FeatureActivationOptions {
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  forceEnable?: boolean;
}

export interface FeatureStatus {
  enabled: boolean;
  level: 'minimal' | 'reduced' | 'full';
  reason: string;
}

export interface FeatureActivationResult {
  features: Record<string, FeatureStatus>;
  capabilities: any;
  isEnabled(featureId: string): boolean;
  getLevel(featureId: string): string;
  loadFeatureDependencies(featureId: string): Promise<boolean>;
}

// Define feature requirements (simplified)
const FEATURE_REQUIREMENTS: Record<string, {
  minimum: Record<string, any>;
  recommended: Record<string, any>;
}> = {
  'text-generation': {
    minimum: { memory: 1, cpu: { cores: 1 } },
    recommended: { memory: 4, cpu: { cores: 2 }, gpu: { supported: true } }
  },
  'image-recognition': {
    minimum: { memory: 2, cpu: { cores: 2 } },
    recommended: { memory: 8, cpu: { cores: 4 }, gpu: { supported: true } }
  },
  'voice-processing': {
    minimum: { memory: 1, cpu: { cores: 2 } },
    recommended: { memory: 4, cpu: { cores: 4 } }
  },
  'real-time-translation': {
    minimum: { memory: 2, cpu: { cores: 2 } },
    recommended: { memory: 4, cpu: { cores: 4 }, gpu: { supported: true } }
  }
};

/**
 * Detects device capabilities
 * This is a simplified version - in a real implementation this would be more comprehensive
 */
async function detectDeviceCapabilities() {
  const capabilities: {
    cpu: { cores: number; supported: boolean };
    memory: number;
    gpu: { supported: boolean };
    [key: string]: any;
  } = {
    cpu: {
      cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1,
      supported: true
    },
    memory: typeof navigator !== 'undefined' && 'deviceMemory' in navigator ?
      (navigator as any).deviceMemory || 4 : 4,
    gpu: {
      supported: false
    }
  };

  // Check for GPU support
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') ||
                canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl');
      if (gl) {
        capabilities.gpu.supported = true;
      }
    } catch (e) {
      console.warn('Error detecting GPU', e);
    }
  }

  return capabilities;
}

/**
 * Progressively enables AI features based on device capabilities
 */
export async function capabilityAwareFeatureActivation(
  options: FeatureActivationOptions = {}
): Promise<FeatureActivationResult> {
  const {
    requiredFeatures = [],
    optionalFeatures = [],
    forceEnable = false
  } = options;

  const capabilities = await detectDeviceCapabilities();
  const allFeatures = [...new Set([...requiredFeatures, ...optionalFeatures])];
  const result: Record<string, FeatureStatus> = {};

  // Helper to check if device meets feature requirements
  function meetsRequirements(requirements: Record<string, any>) {
    if (!requirements) return true;

    for (const [key, value] of Object.entries(requirements)) {
      if (key === 'cpu' && 'cores' in value) {
        if (!capabilities.cpu || capabilities.cpu.cores < value.cores) {
          return false;
        }
      } else if (key === 'gpu' && 'supported' in value) {
        if (!capabilities.gpu || capabilities.gpu.supported !== value.supported) {
          return false;
        }
      } else if (typeof value === 'number') {
        // For simple numeric comparisons like memory
        if (!capabilities[key] || capabilities[key] < value) {
          return false;
        }
      }
    }
    return true;
  }

  // Process each feature
  for (const feature of allFeatures) {
    const requirements = FEATURE_REQUIREMENTS[feature];

    if (!requirements) {
      // Unknown feature, enable by default
      result[feature] = {
        enabled: true,
        level: 'full',
        reason: 'No specific requirements defined'
      };
      continue;
    }

    // Check if device meets recommended specs
    if (meetsRequirements(requirements.recommended)) {
      result[feature] = {
        enabled: true,
        level: 'full',
        reason: 'Device meets recommended requirements'
      };
    }
    // Check if device meets minimum specs
    else if (meetsRequirements(requirements.minimum)) {
      result[feature] = {
        enabled: true,
        level: 'reduced',
        reason: 'Device meets minimum but not recommended requirements'
      };
    }
    // Device doesn't meet minimum specs
    else {
      const isRequired = requiredFeatures.includes(feature);

      result[feature] = {
        enabled: isRequired || forceEnable,
        level: 'minimal',
        reason: 'Device does not meet minimum requirements'
      };
    }
  }

  return {
    features: result,
    capabilities,

    // Helper method to check if a feature is enabled
    isEnabled(featureId: string): boolean {
      return result[featureId]?.enabled || false;
    },

    // Helper method to get feature level
    getLevel(featureId: string): string {
      return result[featureId]?.level || 'none';
    },

    // Helper method to load feature dependencies
    async loadFeatureDependencies(featureId: string): Promise<boolean> {
      const feature = result[featureId];
      if (!feature?.enabled) return false;

      // This would dynamically load resources based on level
      // Simplified implementation for now
      console.log(`Loading ${featureId} at ${feature.level} level`);

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;
    }
  };
}
