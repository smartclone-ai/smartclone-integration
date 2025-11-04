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
  multiElasticResourceAllocation,
  encryptedHybridStorage,
  capabilityAwareFeatureActivation,
  type ResourceAllocationOptions,
  type StorageOptions,
  type StoreOptions,
  type RetrieveOptions,
  type QueryOptions,
  type FeatureActivationOptions
} from './core';

import * as utils from './utils';

/**
 * SmartClone configuration options
 */
export interface SmartCloneOptions {
  storagePrefix?: string;
  encryptionLevel?: 'none' | 'metadata' | 'full';
  persistEncryptionKey?: boolean;
  models?: Record<string, any>;
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  forceEnable?: boolean;
}

/**
 * SmartClone: Hardware-adaptive AI scaling with hybrid storage and progressive enhancement
 */
export default class SmartClone {
  private options: SmartCloneOptions;
  private initialized: boolean = false;
  private _storage: any = null;
  private _capabilities: any = null;
  private _features: any = null;

  /**
   * Create a new SmartClone instance
   * @param options Configuration options
   */
  constructor(options: SmartCloneOptions = {}) {
    this.options = {
      storagePrefix: 'smartclone',
      encryptionLevel: 'metadata',
      persistEncryptionKey: false,
      models: {},
      requiredFeatures: [],
      optionalFeatures: [],
      forceEnable: false,
      ...options
    };
  }

  /**
   * Initialize SmartClone
   */
  async initialize() {
    if (this.initialized) return this;

    // Detect capabilities first
    this._capabilities = await utils.deviceDetection.detectDeviceCapabilities();

    // Initialize storage
    this._storage = await encryptedHybridStorage({
      storagePrefix: this.options.storagePrefix,
      encryptionLevel: this.options.encryptionLevel,
      persistEncryptionKey: this.options.persistEncryptionKey
    });

    // Initialize feature activation
    this._features = await capabilityAwareFeatureActivation({
      requiredFeatures: this.options.requiredFeatures,
      optionalFeatures: this.options.optionalFeatures,
      forceEnable: this.options.forceEnable
    });

    this.initialized = true;
    return this;
  }

  /**
   * Get device capabilities
   */
  async getCapabilities() {
    if (!this._capabilities) {
      this._capabilities = await utils.deviceDetection.detectDeviceCapabilities();
    }
    return this._capabilities;
  }

  /**
   * Allocate resources for AI task
   */
  async allocateResources(options: ResourceAllocationOptions = {}) {
    if (!this.initialized) await this.initialize();

    return multiElasticResourceAllocation({
      ...options,
      models: this.options.models
    });
  }

  /**
   * Get storage interface
   */
  async getStorage() {
    if (!this._storage) {
      await this.initialize();
    }
    return this._storage;
  }

  /**
   * Store data in hybrid storage
   */
  async store(data: any, options: StoreOptions = {}) {
    if (!this._storage) {
      await this.initialize();
    }
    return this._storage.store(data, options);
  }

  /**
   * Retrieve data from hybrid storage
   */
  async retrieve(id: string, options: RetrieveOptions = {}) {
    if (!this._storage) {
      await this.initialize();
    }
    return this._storage.retrieve(id, options);
  }

  /**
   * Query data in hybrid storage
   */
  async query(query: any, options: QueryOptions = {}) {
    if (!this._storage) {
      await this.initialize();
    }
    return this._storage.query(query, options);
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(featureId: string) {
    if (!this._features) {
      await this.initialize();
    }
    return this._features.isEnabled(featureId);
  }

  /**
   * Get feature activation level
   */
  async getFeatureLevel(featureId: string) {
    if (!this._features) {
      await this.initialize();
    }
    return this._features.getLevel(featureId);
  }

  /**
   * Load feature dependencies
   */
  async loadFeature(featureId: string) {
    if (!this._features) {
      await this.initialize();
    }
    return this._features.loadFeatureDependencies(featureId);
  }

  /**
   * Get all enabled features
   */
  async getEnabledFeatures() {
    if (!this._features) {
      await this.initialize();
    }

    const result: Record<string, any> = {};
    for (const [id, feature] of Object.entries(this._features.features)) {
      if ((feature as any).enabled) {
        result[id] = feature;
      }
    }
    return result;
  }
}

// Export individual components
export {
  multiElasticResourceAllocation,
  encryptedHybridStorage,
  capabilityAwareFeatureActivation
};

// Export utilities
export { utils };

// Export types
export type {
  ResourceAllocationOptions,
  StorageOptions,
  StoreOptions,
  RetrieveOptions,
  QueryOptions,
  FeatureActivationOptions
};
