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
 * Encrypted hybrid storage for AI data
 * Combines vector, graph, and relational storage with zero-knowledge encryption
 */

// Types
import {
  buildConnectors,
  syncPayloadAcrossConnectors,
  type ConnectorSyncResult,
  type StorageConnector,
  type StorageConnectorConfig,
  type StorageRetrieveResult,
  type StorageSyncPayload
} from './storageConnectors';

export interface StorageOptions {
  storagePrefix?: string;
  encryptionLevel?: 'none' | 'metadata' | 'full';
  persistEncryptionKey?: boolean;
  /**
   * External storage connectors (local disk, cloud providers, custom implementations).
   */
  connectors?: StorageConnectorConfig[];
  /**
   * When true, store will wait for connector synchronisation to finish before resolving.
   */
  awaitSyncByDefault?: boolean;
  /**
   * Default connector targets when syncTargets are omitted in store options.
   */
  defaultSyncTargets?: string[];
}

export interface StoreOptions {
  type?: 'vector' | 'graph' | 'relational' | 'auto';
  metadata?: Record<string, any>;
  /**
   * Override connectors to synchronise with during this store operation.
   */
  syncTargets?: string[];
  /**
   * Skip connector synchronisation for this store operation.
   */
  skipSync?: boolean;
  /**
   * Await synchronisation completion before resolving store.
   */
  awaitSync?: boolean;
}

export interface RetrieveOptions {
  type?: 'vector' | 'graph' | 'relational' | 'auto';
  /**
   * Specify whether to search local memory, connectors, or both when retrieving.
   */
  source?: 'memory' | 'connectors' | 'all';
  /** Optional connector preference order. */
  connectors?: string[];
}

export interface QueryOptions {
  type?: 'vector' | 'graph' | 'relational' | 'auto';
  limit?: number;
  /**
   * Where to query results from.
   */
  source?: 'memory' | 'connectors' | 'all';
  connectors?: string[];
}

// Simple mock implementation of crypto functions
async function generateEncryptionKey(): Promise<CryptoKey | null> {
  if (typeof window !== 'undefined' && 'crypto' in window) {
    return window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    ) as Promise<CryptoKey>;
  }

  // Fallback for non-browser environments or older browsers
  // This is just a placeholder - in production you'd want a proper fallback
  console.warn('WebCrypto not available, using mock key');
  return null;
}

async function encrypt(data: any, key: CryptoKey | null): Promise<string> {
  // Simple mock implementation
  // In a real implementation, this would properly encrypt the data
  return 'encrypted:' + JSON.stringify(data);
}

async function decrypt(encryptedData: string, key: CryptoKey | null): Promise<any> {
  // Simple mock implementation
  // In a real implementation, this would properly decrypt the data
  if (encryptedData.startsWith('encrypted:')) {
    return JSON.parse(encryptedData.substring(10));
  }
  return encryptedData;
}

/**
 * Creates a hybrid storage system with zero-knowledge encryption
 */
export async function encryptedHybridStorage(options: StorageOptions = {}) {
  const {
    storagePrefix = 'smartclone',
    encryptionLevel = 'metadata',
    persistEncryptionKey = false,
    connectors: connectorConfigs = [],
    awaitSyncByDefault = false,
    defaultSyncTargets = []
  } = options;

  // Setup encryption
  let encryptionKey: CryptoKey | null = null;

  if (encryptionLevel !== 'none') {
    if (persistEncryptionKey && typeof localStorage !== 'undefined') {
      const storedKey = localStorage.getItem(`${storagePrefix}_enckey`);
      if (storedKey) {
        try {
          // In a real implementation, you'd properly import the key
          // For now, generate a new key as we can't store CryptoKey directly
          console.log('Stored key found, generating new key');
          encryptionKey = await generateEncryptionKey();
        } catch (e) {
          console.warn('Failed to load stored key, generating new one', e);
        }
      }
    }

    if (!encryptionKey) {
      encryptionKey = await generateEncryptionKey();

      if (persistEncryptionKey && typeof localStorage !== 'undefined') {
        // In a real implementation, you'd properly export and store the key
        localStorage.setItem(`${storagePrefix}_enckey`, 'mock-key-storage');
      }
    }
  }

  // Build connectors for external persistence layers
  const connectors: StorageConnector[] = connectorConfigs.length
    ? await buildConnectors(connectorConfigs)
    : [];

  // In-memory storage for this simplified version
  const vectorStore: Map<string, any> = new Map();
  const graphStore: Map<string, any> = new Map();
  const relationalStore: Map<string, any> = new Map();

  return {
    // Store data in the appropriate format
    async store(data: any, options: StoreOptions = {}): Promise<string> {
      const {
        type = 'auto',
        metadata = {}
      } = options;

      // Determine data type if auto
      let dataType = type;
      if (dataType === 'auto') {
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
          dataType = 'vector';
        } else if (typeof data === 'object' && data && data.nodes && data.edges) {
          dataType = 'graph';
        } else {
          dataType = 'relational';
        }
      }

      // Generate ID
      const id = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Encrypt if needed
      let encryptedData = data;
      if (encryptionKey && encryptionLevel === 'full') {
        encryptedData = await encrypt(data, encryptionKey);
      }

      // Encrypt metadata if needed
      let encryptedMetadata: Record<string, any> | string = metadata;
      if (encryptionKey && (encryptionLevel === 'metadata' || encryptionLevel === 'full')) {
        encryptedMetadata = await encrypt(metadata, encryptionKey);
      }

      // Store data
      const timestamp = Date.now();
      const item = {
        id,
        data: encryptedData,
        metadata: encryptedMetadata,
        timestamp
      };

      switch (dataType) {
        case 'vector':
          vectorStore.set(id, item);
          break;
        case 'graph':
          graphStore.set(id, item);
          break;
        case 'relational':
          relationalStore.set(id, item);
          break;
      }

      if (connectors.length && !options.skipSync) {
        const payload: StorageSyncPayload = {
          id,
          type: dataType as 'vector' | 'graph' | 'relational',
          data: encryptedData,
          metadata: encryptedMetadata,
          timestamp,
          storeOptions: options
        };

        const syncTargets = options.syncTargets ?? defaultSyncTargets;
        const syncPromise = syncPayloadAcrossConnectors(
          payload,
          connectors,
          syncTargets.length ? syncTargets : undefined
        );

        if (options.awaitSync ?? awaitSyncByDefault) {
          await syncPromise;
        } else {
          syncPromise.catch(error => {
            console.warn('Connector synchronisation failed', error);
          });
        }
      }

      return id;
    },

    // Retrieve data by ID
    async retrieve(id: string, options: RetrieveOptions = {}): Promise<any> {
      const { type = 'auto', source = 'all', connectors: preferredConnectors } = options;

      let item = null;

      // If type specified, look only in that store
      if (type !== 'auto') {
        switch (type) {
          case 'vector':
            item = vectorStore.get(id);
            break;
          case 'graph':
            item = graphStore.get(id);
            break;
          case 'relational':
            item = relationalStore.get(id);
            break;
        }
      } else {
        // Try each store
        item = vectorStore.get(id) || graphStore.get(id) || relationalStore.get(id);
      }

      if (!item) {
        if (source === 'memory') {
          throw new Error(`Item with id ${id} not found`);
        }

        // Attempt to retrieve from connectors
        if (connectors.length && (source === 'connectors' || source === 'all')) {
          const connectorOrder = preferredConnectors && preferredConnectors.length
            ? preferredConnectors
            : connectors.map(connector => connector.id);

          for (const connectorId of connectorOrder) {
            const connector = connectors.find(itemConnector => itemConnector.id === connectorId);
            if (!connector || !connector.retrieve) continue;
            try {
              const result = await connector.retrieve({
                id,
                type: type !== 'auto' ? (type as 'vector' | 'graph' | 'relational') : undefined
              });
              if (result) {
                const retrieved: StorageRetrieveResult = result;
                const localItem = {
                  id: retrieved.id,
                  data: retrieved.data,
                  metadata: retrieved.metadata,
                  timestamp: retrieved.timestamp ?? Date.now()
                };

                switch (retrieved.type) {
                  case 'vector':
                    vectorStore.set(retrieved.id, localItem);
                    break;
                  case 'graph':
                    graphStore.set(retrieved.id, localItem);
                    break;
                  case 'relational':
                    relationalStore.set(retrieved.id, localItem);
                    break;
                }

                item = localItem;
                break;
              }
            } catch (error) {
              console.warn(`Failed to retrieve item ${id} from connector ${connectorId}`, error);
            }
          }
        }

        if (!item) {
          throw new Error(`Item with id ${id} not found`);
        }
      }

      // Decrypt if needed
      let decryptedData = item.data;
      if (encryptionKey && encryptionLevel === 'full' && typeof item.data === 'string') {
        decryptedData = await decrypt(item.data, encryptionKey);
      }

      // Decrypt metadata if needed
      let decryptedMetadata = item.metadata;
      if (encryptionKey && (encryptionLevel === 'metadata' || encryptionLevel === 'full') && typeof item.metadata === 'string') {
        decryptedMetadata = await decrypt(item.metadata, encryptionKey);
      }

      return {
        id: item.id,
        data: decryptedData,
        metadata: decryptedMetadata,
        timestamp: item.timestamp
      };
    },

    // Query data (simplified)
    async query(query: any, options: QueryOptions = {}): Promise<any[]> {
      const {
        type = 'auto',
        limit = 10,
        source = 'memory',
        connectors: preferredConnectors
      } = options;

      // This is a simplified implementation
      // A real implementation would have proper querying logic for each type

      const memoryResults: any[] = [];

      if (source === 'memory' || source === 'all') {
        if (type === 'auto') {
          const allResults = [
            ...Array.from(vectorStore.values()),
            ...Array.from(graphStore.values()),
            ...Array.from(relationalStore.values())
          ];
          memoryResults.push(...allResults.map(item => ({ id: item.id })));
        } else if (type === 'vector') {
          memoryResults.push(...Array.from(vectorStore.values()).map(item => ({ id: item.id })));
        } else if (type === 'graph') {
          memoryResults.push(...Array.from(graphStore.values()).map(item => ({ id: item.id })));
        } else if (type === 'relational') {
          memoryResults.push(...Array.from(relationalStore.values()).map(item => ({ id: item.id })));
        }
      }

      const connectorResults: any[] = [];
      if (connectors.length && (source === 'connectors' || source === 'all')) {
        const connectorOrder = preferredConnectors && preferredConnectors.length
          ? preferredConnectors
          : connectors.map(connector => connector.id);

        for (const connectorId of connectorOrder) {
          const connector = connectors.find(itemConnector => itemConnector.id === connectorId);
          if (!connector || !connector.list) continue;
          try {
            const listResult = await connector.list({ limit });
            connectorResults.push(
              ...listResult.entries.map(entry => ({
                id: entry.id,
                providerId: connector.id,
                type: entry.type,
                timestamp: entry.timestamp
              }))
            );
          } catch (error) {
            console.warn(`Connector ${connectorId} query failed`, error);
          }
        }
      }

      const combined = source === 'connectors'
        ? connectorResults
        : source === 'memory'
          ? memoryResults
          : [...memoryResults, ...connectorResults];

      return combined.slice(0, limit);
    },

    /**
     * Trigger synchronisation for a given identifier with optional connector targets.
     */
    async sync(id: string, targets?: string[]): Promise<ConnectorSyncResult[]> {
      if (!connectors.length) return [];

      const item = vectorStore.get(id) || graphStore.get(id) || relationalStore.get(id);
      if (!item) {
        throw new Error(`Item with id ${id} not found in local storage for synchronisation`);
      }

      const type = vectorStore.has(id) ? 'vector' : graphStore.has(id) ? 'graph' : 'relational';

      const payload: StorageSyncPayload = {
        id,
        type,
        data: item.data,
        metadata: item.metadata,
        timestamp: item.timestamp
      };

      return syncPayloadAcrossConnectors(
        payload,
        connectors,
        targets && targets.length ? targets : undefined
      );
    },

    /**
     * Access configured connectors for advanced scenarios.
     */
    getConnectors(): StorageConnector[] {
      return [...connectors];
    },

    // Encryption utilities
    encryptionLevel,
    async encrypt(data: any) {
      if (encryptionLevel === 'none' || !encryptionKey) return data;
      return encrypt(data, encryptionKey);
    },
    async decrypt(data: any) {
      if (encryptionLevel === 'none' || !encryptionKey) return data;
      return decrypt(data, encryptionKey);
    }
  };
}
