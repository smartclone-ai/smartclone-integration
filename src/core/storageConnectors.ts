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

import type { StoreOptions } from './encryptedHybridStorage';

/**
 * Supported storage connector types
 */
export type StorageConnectorType =
  | 'local-disk'
  | 'onedrive'
  | 'googledrive'
  | 'pcloud'
  | 'custom';

/**
 * Data payload that will be forwarded to storage connectors.
 * Data and metadata have already gone through encryption when required.
 */
export interface StorageSyncPayload {
  id: string;
  type: 'vector' | 'graph' | 'relational';
  data: any;
  metadata: Record<string, any> | string;
  timestamp: number;
  storeOptions?: StoreOptions;
}

export interface StorageRetrieveReference {
  id: string;
  type?: 'vector' | 'graph' | 'relational';
}

export interface StorageRetrieveResult {
  id: string;
  type: 'vector' | 'graph' | 'relational';
  data: any;
  metadata: any;
  timestamp?: number;
  providerId: string;
  raw?: unknown;
}

export interface StorageListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface StorageListResult {
  entries: Array<{
    id: string;
    providerId: string;
    type?: string;
    timestamp?: number;
    size?: number;
    raw?: unknown;
  }>;
  nextCursor?: string;
}

export interface StorageConnectorResult {
  success: boolean;
  providerId: string;
  location?: string;
  error?: unknown;
  raw?: unknown;
}

export interface BaseConnectorConfig {
  id?: string;
  type: StorageConnectorType;
  enabled?: boolean;
  /**
   * When true (default) the connector will be invoked automatically on store.
   */
  autoSync?: boolean;
}

export interface LocalDiskConnectorConfig extends BaseConnectorConfig {
  type: 'local-disk';
  /**
   * Directory path where payloads will be persisted. Must be accessible in Node.js environments.
   */
  directory: string;
  /** Optional prefix for generated filenames. */
  filePrefix?: string;
}

export interface OAuthConnectorConfig extends BaseConnectorConfig {
  accessToken: string;
  /** Optional root path/folder for persisted payloads. */
  rootPath?: string;
  /**
   * Custom fetch implementation. Useful for environments that provide their own fetch function.
   */
  fetchImplementation?: typeof fetch;
}

export interface OneDriveConnectorConfig extends OAuthConnectorConfig {
  type: 'onedrive';
  driveId?: string;
}

export interface GoogleDriveConnectorConfig extends OAuthConnectorConfig {
  type: 'googledrive';
  /** Optional folder ID where payloads should be uploaded. */
  folderId?: string;
}

export interface PCloudConnectorConfig extends OAuthConnectorConfig {
  type: 'pcloud';
  /** Optional folder path where payloads should be uploaded. */
  folderPath?: string;
  /**
   * API host. Defaults to https://api.pcloud.com.
   */
  apiHost?: string;
}

export interface CustomConnectorConfig extends BaseConnectorConfig {
  type: 'custom';
  /**
   * Custom implementation factory returning an object that matches the StorageConnector contract.
   */
  factory: () => Promise<StorageConnector> | StorageConnector;
}

export type StorageConnectorConfig =
  | LocalDiskConnectorConfig
  | OneDriveConnectorConfig
  | GoogleDriveConnectorConfig
  | PCloudConnectorConfig
  | CustomConnectorConfig;

export interface StorageConnector {
  readonly id: string;
  readonly type: StorageConnectorType;
  readonly autoSync: boolean;
  initialize(): Promise<void>;
  store(payload: StorageSyncPayload): Promise<StorageConnectorResult>;
  retrieve?(reference: StorageRetrieveReference): Promise<StorageRetrieveResult | null>;
  list?(options?: StorageListOptions): Promise<StorageListResult>;
  delete?(reference: StorageRetrieveReference): Promise<void>;
}

function createConnectorId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureFs() {
  if (typeof window !== 'undefined') {
    throw new Error('Local disk storage is only available in Node.js environments.');
  }

  try {
    const fsModule = await import('fs/promises');
    return fsModule;
  } catch (error) {
    throw new Error(`Failed to load fs/promises for local disk connector: ${(error as Error).message}`);
  }
}

async function ensurePath() {
  try {
    const pathModule = await import('path');
    return pathModule;
  } catch (error) {
    throw new Error(`Failed to load path module for local disk connector: ${(error as Error).message}`);
  }
}

function resolveFetch(custom?: typeof fetch) {
  if (custom) return custom;
  if (typeof fetch !== 'undefined') return fetch;
  throw new Error('Fetch API is not available in this environment. Provide fetchImplementation in connector config.');
}

async function createLocalDiskConnector(config: LocalDiskConnectorConfig): Promise<StorageConnector> {
  const id = config.id ?? createConnectorId('local');
  const fs = await ensureFs();
  const path = await ensurePath();
  const autoSync = config.autoSync ?? true;

  async function ensureDirectory() {
    await fs.mkdir(config.directory, { recursive: true });
  }

  return {
    id,
    type: 'local-disk',
    autoSync,
    async initialize() {
      await ensureDirectory();
    },
    async store(payload) {
      await ensureDirectory();
      const filename = `${config.filePrefix ?? 'smartclone'}-${payload.id}.json`;
      const filePath = path.join(config.directory, filename);
      const body = JSON.stringify(payload, null, 2);
      await fs.writeFile(filePath, body, 'utf-8');
      return { success: true, providerId: id, location: filePath };
    },
    async retrieve(reference) {
      const files = await fs.readdir(config.directory);
      const target = files.find(file => file.includes(reference.id));
      if (!target) return null;
      const filePath = path.join(config.directory, target);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as StorageSyncPayload;
      return {
        id: parsed.id,
        type: parsed.type,
        data: parsed.data,
        metadata: parsed.metadata,
        timestamp: parsed.timestamp,
        providerId: id,
        raw: parsed
      };
    },
    async list(options = {}) {
      const entries = await fs.readdir(config.directory, { withFileTypes: true });
      const files = entries.filter(entry => entry.isFile());
      const results: StorageListResult['entries'] = [];
      for (const entry of files) {
        if (options.prefix && !entry.name.startsWith(options.prefix)) continue;
        const filePath = path.join(config.directory, entry.name);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(content) as StorageSyncPayload;
          results.push({
            id: parsed.id,
            providerId: id,
            type: parsed.type,
            timestamp: parsed.timestamp,
            raw: entry
          });
        } catch (error) {
          console.warn(`Failed to parse local disk connector entry ${entry.name}`, error);
        }
        if (options.limit && results.length >= options.limit) {
          break;
        }
      }
      return { entries: results };
    },
    async delete(reference) {
      const files = await fs.readdir(config.directory);
      const target = files.find(file => file.includes(reference.id));
      if (!target) return;
      const filePath = path.join(config.directory, target);
      await fs.unlink(filePath);
    }
  } satisfies StorageConnector;
}

async function createOneDriveConnector(config: OneDriveConnectorConfig): Promise<StorageConnector> {
  const id = config.id ?? createConnectorId('onedrive');
  const autoSync = config.autoSync ?? true;
  const fetchImpl = resolveFetch(config.fetchImplementation);

  async function upload(payload: StorageSyncPayload) {
    const fileName = `${payload.id}.json`;
    const rootPath = (config.rootPath ?? 'Apps/SmartClone').replace(/(^\/|\/$)/g, '');
    const encodedPath = [rootPath, fileName].filter(Boolean).join('/');
    const baseUrl = config.driveId
      ? `https://graph.microsoft.com/v1.0/drives/${config.driveId}/root:/`
      : 'https://graph.microsoft.com/v1.0/me/drive/root:/';
    const url = `${baseUrl}${encodeURIComponent(encodedPath)}:/content`;
    const response = await fetchImpl(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OneDrive upload failed: ${response.status} ${errorBody}`);
    }
    return response;
  }

  async function download(reference: StorageRetrieveReference) {
    const rootPath = (config.rootPath ?? 'Apps/SmartClone').replace(/(^\/|\/$)/g, '');
    const encodedPath = [rootPath, `${reference.id}.json`].filter(Boolean).join('/');
    const baseUrl = config.driveId
      ? `https://graph.microsoft.com/v1.0/drives/${config.driveId}/root:/`
      : 'https://graph.microsoft.com/v1.0/me/drive/root:/';
    const url = `${baseUrl}${encodeURIComponent(encodedPath)}:/content`;
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OneDrive download failed: ${response.status} ${errorBody}`);
    }
    return response.json();
  }

  return {
    id,
    type: 'onedrive',
    autoSync,
    async initialize() {
      // No-op. Requests are authenticated per call.
    },
    async store(payload) {
      const response = await upload(payload);
      return { success: true, providerId: id, raw: await response.json().catch(() => undefined) };
    },
    async retrieve(reference) {
      const downloaded = await download(reference);
      if (!downloaded) return null;
      const payload = downloaded as StorageSyncPayload;
      return {
        id: payload.id,
        type: payload.type,
        data: payload.data,
        metadata: payload.metadata,
        timestamp: payload.timestamp,
        providerId: id,
        raw: downloaded
      };
    }
  } satisfies StorageConnector;
}

async function createGoogleDriveConnector(config: GoogleDriveConnectorConfig): Promise<StorageConnector> {
  const id = config.id ?? createConnectorId('gdrive');
  const autoSync = config.autoSync ?? true;
  const fetchImpl = resolveFetch(config.fetchImplementation);

  async function upload(payload: StorageSyncPayload) {
    const boundary = `smartclone-${Date.now().toString(36)}`;
    const metadata = {
      name: `${payload.id}.json`,
      mimeType: 'application/json',
      ...(config.folderId ? { parents: [config.folderId] } : {})
    };
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      JSON.stringify(payload),
      `--${boundary}--`,
      ''
    ].join('\r\n');

    const response = await fetchImpl('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Drive upload failed: ${response.status} ${errorBody}`);
    }

    return response;
  }

  async function download(reference: StorageRetrieveReference) {
    const query = encodeURIComponent(`name='${reference.id}.json'` + (config.folderId ? ` and '${config.folderId}' in parents` : ''));
    const listResponse = await fetchImpl(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });
    if (!listResponse.ok) {
      const errorBody = await listResponse.text();
      throw new Error(`Google Drive list failed: ${listResponse.status} ${errorBody}`);
    }
    const listData = await listResponse.json() as { files?: Array<{ id: string }> };
    const fileId = listData.files?.[0]?.id;
    if (!fileId) return null;

    const downloadResponse = await fetchImpl(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });
    if (!downloadResponse.ok) {
      const errorBody = await downloadResponse.text();
      throw new Error(`Google Drive download failed: ${downloadResponse.status} ${errorBody}`);
    }
    return downloadResponse.json();
  }

  return {
    id,
    type: 'googledrive',
    autoSync,
    async initialize() {
      // No specific initialization required beyond verifying credentials during first call.
    },
    async store(payload) {
      const response = await upload(payload);
      return { success: true, providerId: id, raw: await response.json().catch(() => undefined) };
    },
    async retrieve(reference) {
      const downloaded = await download(reference);
      if (!downloaded) return null;
      const payload = downloaded as StorageSyncPayload;
      return {
        id: payload.id,
        type: payload.type,
        data: payload.data,
        metadata: payload.metadata,
        timestamp: payload.timestamp,
        providerId: id,
        raw: downloaded
      };
    }
  } satisfies StorageConnector;
}

async function createPCloudConnector(config: PCloudConnectorConfig): Promise<StorageConnector> {
  const id = config.id ?? createConnectorId('pcloud');
  const autoSync = config.autoSync ?? true;
  const fetchImpl = resolveFetch(config.fetchImplementation);
  const apiHost = (config.apiHost ?? 'https://api.pcloud.com').replace(/\/$/, '');

  function buildUploadUrl(fileName: string) {
    const params = new URLSearchParams({
      filename: fileName,
      metadata: '1'
    });
    if (config.folderPath) {
      params.set('path', config.folderPath);
    }
    return `${apiHost}/uploadfile?${params.toString()}`;
  }

  async function upload(payload: StorageSyncPayload) {
    if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
      throw new Error('FormData and Blob globals are required for pCloud connector uploads.');
    }
    const form = new FormData();
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    form.append('file', blob, `${payload.id}.json`);

    const response = await fetchImpl(buildUploadUrl(`${payload.id}.json`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      },
      body: form
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`pCloud upload failed: ${response.status} ${errorBody}`);
    }

    return response;
  }

  async function download(reference: StorageRetrieveReference) {
    const params = new URLSearchParams({
      path: `${config.folderPath ?? ''}/${reference.id}.json`,
      checkfilename: '1'
    });
    const url = `${apiHost}/getfilelink?${params.toString()}`;
    const linkResponse = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });
    if (!linkResponse.ok) {
      if (linkResponse.status === 404) return null;
      const errorBody = await linkResponse.text();
      throw new Error(`pCloud getfilelink failed: ${linkResponse.status} ${errorBody}`);
    }
    const linkData = await linkResponse.json() as { hosts?: string[]; path?: string };
    if (!linkData.hosts || !linkData.hosts.length || !linkData.path) {
      return null;
    }
    const downloadUrl = `https://${linkData.hosts[0]}${linkData.path}`;
    const downloadResponse = await fetchImpl(downloadUrl, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    });
    if (!downloadResponse.ok) {
      const errorBody = await downloadResponse.text();
      throw new Error(`pCloud download failed: ${downloadResponse.status} ${errorBody}`);
    }
    return downloadResponse.json();
  }

  return {
    id,
    type: 'pcloud',
    autoSync,
    async initialize() {
      // No initialization. Requests validate credentials on demand.
    },
    async store(payload) {
      const response = await upload(payload);
      return { success: true, providerId: id, raw: await response.json().catch(() => undefined) };
    },
    async retrieve(reference) {
      const downloaded = await download(reference);
      if (!downloaded) return null;
      const payload = downloaded as StorageSyncPayload;
      return {
        id: payload.id,
        type: payload.type,
        data: payload.data,
        metadata: payload.metadata,
        timestamp: payload.timestamp,
        providerId: id,
        raw: downloaded
      };
    }
  } satisfies StorageConnector;
}

async function createCustomConnector(config: CustomConnectorConfig): Promise<StorageConnector> {
  const connector = await config.factory();
  return connector;
}

export async function buildConnectors(configs: StorageConnectorConfig[] = []): Promise<StorageConnector[]> {
  const connectors: StorageConnector[] = [];

  for (const config of configs) {
    if (config.enabled === false) continue;

    switch (config.type) {
      case 'local-disk':
        connectors.push(await createLocalDiskConnector(config));
        break;
      case 'onedrive':
        connectors.push(await createOneDriveConnector(config));
        break;
      case 'googledrive':
        connectors.push(await createGoogleDriveConnector(config));
        break;
      case 'pcloud':
        connectors.push(await createPCloudConnector(config));
        break;
      case 'custom':
        connectors.push(await createCustomConnector(config));
        break;
      default:
        throw new Error(`Unsupported connector type: ${(config as StorageConnectorConfig).type}`);
    }
  }

  await Promise.all(connectors.map(connector => connector.initialize()));

  return connectors;
}

export interface ConnectorSyncResult {
  providerId: string;
  success: boolean;
  error?: unknown;
  location?: string;
  raw?: unknown;
}

export async function syncPayloadAcrossConnectors(
  payload: StorageSyncPayload,
  connectors: StorageConnector[],
  targets?: string[]
): Promise<ConnectorSyncResult[]> {
  if (!connectors.length) return [];

  const operations = connectors
    .filter(connector => {
      if (targets && targets.length > 0) {
        return targets.includes(connector.id);
      }
      return connector.autoSync;
    })
    .map(async connector => {
      try {
        const result = await connector.store(payload);
        return {
          providerId: connector.id,
          success: result.success,
          error: result.error,
          location: result.location,
          raw: result.raw
        } satisfies ConnectorSyncResult;
      } catch (error) {
        return {
          providerId: connector.id,
          success: false,
          error
        } satisfies ConnectorSyncResult;
      }
    });

  return Promise.all(operations);
}
