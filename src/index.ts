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
  MultiElasticResourceAllocation,
  multiElasticResourceAllocation,
  encryptedHybridStorage,
  capabilityAwareFeatureActivation,
  type ResourceAllocationOptions,
  type StorageOptions,
  type StoreOptions,
  type RetrieveOptions,
  type QueryOptions,
  type FeatureActivationOptions,
  type MultiElasticRecommendation,
  type StorageConnectorConfig,
  type ConnectorSyncResult
} from './core';
import { SmartCloneIntegration } from './SmartCloneIntegration';

import * as utils from './utils';

/**
 * SmartClone configuration options
 */
export interface SmartCloneOptions {
  storagePrefix?: string;
  encryptionLevel?: 'none' | 'metadata' | 'full';
  persistEncryptionKey?: boolean;
  storageConnectors?: StorageConnectorConfig[];
  awaitStorageSync?: boolean;
  storageSyncTargets?: string[];
  models?: Record<string, any>;
  requiredFeatures?: string[];
  optionalFeatures?: string[];
  forceEnable?: boolean;
}

/**
 * SmartClone: Hardware-adaptive AI scaling with hybrid storage and progressive enhancement
 */
export default class SmartClone {
  public readonly resourceAllocation: MultiElasticResourceAllocation;
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
      storageConnectors: [],
      awaitStorageSync: false,
      storageSyncTargets: [],
      models: {},
      requiredFeatures: [],
      optionalFeatures: [],
      forceEnable: false,
      ...options
    };

    this.resourceAllocation = new MultiElasticResourceAllocation();
  }

  /**
   * Initialize SmartClone
   */
  async initialize() {
    if (this.initialized) return this;

    // Detect capabilities first
    this._capabilities = await utils.deviceDetection.detectEnhancedCapabilities();

    // Initialize storage
    this._storage = await encryptedHybridStorage({
      storagePrefix: this.options.storagePrefix,
      encryptionLevel: this.options.encryptionLevel,
      persistEncryptionKey: this.options.persistEncryptionKey,
      connectors: this.options.storageConnectors,
      awaitSyncByDefault: this.options.awaitStorageSync,
      defaultSyncTargets: this.options.storageSyncTargets
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
      this._capabilities = await utils.deviceDetection.detectEnhancedCapabilities();
    }
    return this._capabilities;
  }

  /**
   * Allocate resources for AI task
   */
  async allocateResources(options: ResourceAllocationOptions = {}) {
    if (!this.initialized) await this.initialize();

    const capabilities = await this.getCapabilities();
    return multiElasticResourceAllocation({
      ...options,
      models: this.options.models
    }, capabilities);
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
  MultiElasticResourceAllocation,
  multiElasticResourceAllocation,
  encryptedHybridStorage,
  capabilityAwareFeatureActivation,
  SmartCloneIntegration
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
  FeatureActivationOptions,
  MultiElasticRecommendation,
  StorageConnectorConfig,
  ConnectorSyncResult
};
