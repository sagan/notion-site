import "server-only";
import fs from "fs-extra";
import { createStaleWhileRevalidateCache, type StaleWhileRevalidate } from "stale-while-revalidate-cache";
import Keyv from "@keyvhq/core";

class MemoryStorage {
  db: Keyv;
  constructor() {
    this.db = new Keyv();
  }
  async getItem(cacheKey: string): Promise<string> {
    return await this.db.get(cacheKey);
  }
  async setItem(cacheKey: string, value: string) {
    await this.db.set(cacheKey, value);
    return;
  }
  async removeItem(cacheKey: string) {
    return await this.db.delete(cacheKey);
  }
}

class Storage {
  dir: string;
  constructor(dir: string) {
    fs.mkdirpSync(dir);
    this.dir = dir;
  }
  async getItem(cacheKey: string): Promise<string> {
    const filepath = this.key2filepath(cacheKey);
    const exists = await fs.exists(filepath);
    if (!exists) {
      return null;
    }
    return fs.readFile(filepath, { encoding: "utf8" });
  }
  async setItem(cacheKey: string, value: string) {
    return fs.writeFile(this.key2filepath(cacheKey), value);
  }
  async removeItem(cacheKey: string) {
    await fs.remove(this.key2filepath(cacheKey));
    return null;
  }
  key2filepath(cacheKey: string): string {
    return this.dir + "/" + encodeURIComponent(cacheKey);
  }
}

export function createCache(persist = false, ttlSeconds = 0, ttsSeconds = 0) {
  // note: in vercel runtime /tmp has a quota limit of 512 MiB.
  // https://github.com/vercel/vercel/discussions/5320
  const storage = persist
    ? new Storage((process.platform != "win32" ? "/tmp" : process.cwd()) + "/.notion-cache")
    : new MemoryStorage();
  const maxTimeToLive = ttlSeconds ? ttlSeconds * 1000 : Infinity;
  const minTimeToStale = ttsSeconds ? ttsSeconds * 1000 : maxTimeToLive / 2;
  return createStaleWhileRevalidateCache({
    storage,
    minTimeToStale,
    maxTimeToLive,
    serialize: JSON.stringify, // serialize product object to string
    deserialize: JSON.parse, // deserialize cached product string to object
  });
}
