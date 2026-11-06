// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { CitizenApplication, CivicStorageAdapter } from '../core/types.ts';

export type { CivicStorageAdapter };

export class MemoryStorageAdapter implements CivicStorageAdapter {
  private store: Map<string, CitizenApplication> = new Map();

  async loadAll(): Promise<CitizenApplication[]> {
    return Array.from(this.store.values());
  }

  async save(app: CitizenApplication): Promise<void> {
    this.store.set(app.id, structuredClone(app));
  }

  async get(id: string): Promise<CitizenApplication | undefined> {
    const item = this.store.get(id);
    return item ? structuredClone(item) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

export class FileStorageAdapter implements CivicStorageAdapter {
  private filePath: string;
  private cache: Map<string, CitizenApplication> = new Map();
  private initialized = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await readFile(this.filePath, 'utf-8');
      const list = JSON.parse(data) as CitizenApplication[];
      for (const item of list) {
        this.cache.set(item.id, item);
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
      // If file does not exist, start with empty cache
    }
    this.initialized = true;
  }

  private async flush(): Promise<void> {
    const dir = dirname(this.filePath);
    await mkdir(dir, { recursive: true });

    const tmpPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const serialized = JSON.stringify(Array.from(this.cache.values()), null, 2);

    await writeFile(tmpPath, serialized, 'utf-8');
    await rename(tmpPath, this.filePath);
  }

  async loadAll(): Promise<CitizenApplication[]> {
    await this.ensureInitialized();
    return Array.from(this.cache.values()).map(v => structuredClone(v));
  }

  async save(app: CitizenApplication): Promise<void> {
    await this.ensureInitialized();
    this.cache.set(app.id, structuredClone(app));
    await this.flush();
  }

  async get(id: string): Promise<CitizenApplication | undefined> {
    await this.ensureInitialized();
    const item = this.cache.get(id);
    return item ? structuredClone(item) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const existed = this.cache.delete(id);
    if (existed) {
      await this.flush();
    }
    return existed;
  }
}
