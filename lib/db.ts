import Keyv from "@keyvhq/core";
import KeyvRedis from "@keyvhq/redis";
import { type Redis } from "ioredis";
import { redisNamespace, redisUrl } from "./config";

let db: Keyv;
if (redisUrl) {
  // set enableAutoPipelining options to false has little even negative performance benefit.
  const keyvRedis = new KeyvRedis(redisUrl);
  db = new Keyv({ store: keyvRedis, namespace: redisNamespace });
} else {
  db = new Keyv();
}

export { db };

export const PREFIX_PAGE = "p-";
export const PREFIX_IMG = "i-";
export const KEY_SITEMAP = "sitemap";
export const KEY_SITE_CONFIG = "site-config";
export const KEY_JOB_INDEX = "job:index";
export const KEY_JOB_PRECACHE = "job:precache";

export interface SetPayload {
  key: string;
  value: any;
}

export async function dbBatchSet(...payloads: SetPayload[]) {
  if (payloads.length == 0) {
    return;
  }
  // KeyvRedis uses ioredis internally.
  // https://github.com/microlinkhq/keyvhq/blob/master/packages/redis/src/index.js
  // Use redis pipeline to improve performance.
  const redis: Redis = db["store"]?.redis;
  console.log(`db put (batch=${!!redis})`, payloads);

  if (!redis) {
    for (const item of payloads) {
      await db.set(item.key, item.value);
    }
    return;
  }

  const pipeline = redis.pipeline();
  for (const item of payloads) {
    const value = JSON.stringify({
      value: item.value,
      expires: null,
    });
    pipeline.set(redisNamespace + ":" + item.key, value);
  }
  await pipeline.exec();
}
