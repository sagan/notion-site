import "server-only";
import { getBlockValue, getPageProperty, parsePageId } from "notion-utils";
import { db, dbBatchSet, KEY_JOB_INDEX, KEY_JOB_PRECACHE, KEY_SITEMAP, PREFIX_PAGE, SetPayload } from "./db";
import { getCanonicalPageId } from "./get-canonical-page-id";
import { getPage } from "./notion";
import { getRuntimeConfig, type RuntimeSiteConfig } from "./runtime-config";
import type { CanonicalPageMap, SiteMap } from "./types";

export type JobStatus = "idle" | "running" | "paused" | "completed" | "error";

export interface IndexJobState {
  status: JobStatus;
  startedAt: number | null;
  updatedAt: number | null;
  completedAt: number | null;
  rootSpaceId: string | null;
  queue: string[];
  visited: string[];
  canonicalPageMap: CanonicalPageMap;
  processedCount: number;
  errorCount: number;
  lastError?: string;
  logs: string[];
}

export interface PrecacheJobState {
  status: JobStatus;
  startedAt: number | null;
  updatedAt: number | null;
  completedAt: number | null;
  pendingItems: Array<{ slug: string; pageId: string }>;
  completedCount: number;
  totalCount: number;
  failedItems: Array<{ slug: string; pageId: string; error: string }>;
  lastError?: string;
  logs: string[];
}

const DEFAULT_TIME_BUDGET_MS = 35_000;
const CHECKPOINT_INTERVAL = 5;
const MAX_LOGS = 40;

function appendLog(logs: string[], msg: string): string[] {
  const line = `[${new Date().toISOString()}] ${msg}`;
  const next = [...logs, line];
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
}

export function createEmptyIndexJob(): IndexJobState {
  return {
    status: "idle",
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    rootSpaceId: null,
    queue: [],
    visited: [],
    canonicalPageMap: {},
    processedCount: 0,
    errorCount: 0,
    logs: [],
  };
}

export function createEmptyPrecacheJob(): PrecacheJobState {
  return {
    status: "idle",
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    pendingItems: [],
    completedCount: 0,
    totalCount: 0,
    failedItems: [],
    logs: [],
  };
}

export async function getIndexJobState(): Promise<IndexJobState> {
  const stored = await db.get(KEY_JOB_INDEX);
  return stored ? { ...createEmptyIndexJob(), ...stored } : createEmptyIndexJob();
}

export async function getPrecacheJobState(): Promise<PrecacheJobState> {
  const stored = await db.get(KEY_JOB_PRECACHE);
  return stored ? { ...createEmptyPrecacheJob(), ...stored } : createEmptyPrecacheJob();
}

export async function resetIndexJob(): Promise<IndexJobState> {
  const empty = createEmptyIndexJob();
  await db.set(KEY_JOB_INDEX, empty);
  return empty;
}

export async function resetPrecacheJob(): Promise<PrecacheJobState> {
  const empty = createEmptyPrecacheJob();
  await db.set(KEY_JOB_PRECACHE, empty);
  return empty;
}

async function persistIndexCheckpoint(state: IndexJobState, newSlugPayloads: SetPayload[]) {
  state.updatedAt = Date.now();
  if (newSlugPayloads.length > 0) {
    await dbBatchSet(...newSlugPayloads);
  }
  await db.set(KEY_JOB_INDEX, state);
}

function collectChildPageIds(page: any, rootSpaceId: string | null): string[] {
  const discovered: string[] = [];
  for (const key of Object.keys(page.block || {})) {
    const block = getBlockValue(page.block[key]);
    if (!block || block.alive === false) continue;
    if (block.type !== "page" && block.type !== "collection_view_page") continue;
    if (rootSpaceId && block.space_id && block.space_id !== rootSpaceId) continue;
    const parsed = parsePageId(key);
    if (parsed) discovered.push(parsed);
  }

  for (const collectionViews of Object.values(page.collection_query || {})) {
    for (const collectionData of Object.values(collectionViews || {})) {
      const cd = collectionData as any;
      const blockIds = Array.from(
        new Set([...(cd?.collection_group_results?.blockIds || []), ...(cd?.blockIds || [])]),
      );
      for (const itemId of blockIds) {
        const parsed = parsePageId(itemId);
        if (parsed) discovered.push(parsed);
      }
    }
  }
  return discovered;
}

/**
 * Idempotent, resumable URL index job step.
 * Safe for both self-hosting and serverless (respects timeBudgetMs and checkpoints to Redis).
 */
export async function runIndexJobStep(
  options: {
    restart?: boolean;
    timeBudgetMs?: number;
    forceFresh?: boolean;
  } = {},
): Promise<IndexJobState> {
  const { restart = false, timeBudgetMs = DEFAULT_TIME_BUDGET_MS, forceFresh = false } = options;

  const cfg: RuntimeSiteConfig = await getRuntimeConfig();
  if (!cfg.rootNotionPageId) {
    throw new Error("rootNotionPageId is not configured");
  }

  let state = restart ? createEmptyIndexJob() : await getIndexJobState();

  // Start fresh if idle, completed, error, or explicit restart
  if (restart || state.status === "idle" || state.status === "completed" || state.status === "error") {
    const initialQueue = [
      parsePageId(cfg.rootNotionPageId),
      ...cfg.extraRootNotionPageIds.map((id) => parsePageId(id)),
    ].filter(Boolean) as string[];

    state = {
      ...createEmptyIndexJob(),
      status: "running",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      rootSpaceId: cfg.rootNotionSpaceId || null,
      queue: Array.from(new Set(initialQueue)),
      logs: appendLog([], `Started index job (${initialQueue.length} root page(s))`),
    };
    await db.set(KEY_JOB_INDEX, state);
  } else {
    state.status = "running";
    state.logs = appendLog(
      state.logs,
      `Resumed index job (queue=${state.queue.length}, visited=${state.visited.length})`,
    );
    await db.set(KEY_JOB_INDEX, state);
  }

  const visitedSet = new Set(state.visited);
  const queuedSet = new Set(state.queue);
  const startTime = Date.now();
  let pendingPayloads: SetPayload[] = [];
  let sinceLastCheckpoint = 0;

  try {
    while (state.queue.length > 0) {
      if (timeBudgetMs > 0 && Date.now() - startTime >= timeBudgetMs) {
        state.status = "paused";
        state.logs = appendLog(
          state.logs,
          `Time budget reached (${timeBudgetMs}ms). Checkpointed with ${state.queue.length} remaining.`,
        );
        await persistIndexCheckpoint(state, pendingPayloads);
        return state;
      }

      const pageId = state.queue.shift()!;
      queuedSet.delete(pageId);
      if (visitedSet.has(pageId)) {
        continue;
      }
      visitedSet.add(pageId);
      state.visited.push(pageId);

      try {
        const recordMap = await getPage(pageId, { forceFresh });
        if (recordMap) {
          const block = getBlockValue(recordMap.block?.[pageId]);
          const spaceId = block?.space_id;
          if (spaceId) {
            if (!state.rootSpaceId) {
              state.rootSpaceId = spaceId;
            } else if (state.rootSpaceId !== spaceId) {
              state.processedCount++;
              sinceLastCheckpoint++;
              continue;
            }
          }

          if (block && (getPageProperty<boolean | null>("Public", block, recordMap) ?? true)) {
            const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
              rootNotionPageId: cfg.rootNotionPageId,
              inversePageUrlOverrides: cfg.inversePageUrlOverrides,
            });
            if (canonicalPageId && canonicalPageId !== "/" && !state.canonicalPageMap[canonicalPageId]) {
              state.canonicalPageMap[canonicalPageId] = pageId;
              pendingPayloads.push({
                key: PREFIX_PAGE + canonicalPageId,
                value: pageId,
              });
            }
          }

          const children = collectChildPageIds(recordMap, state.rootSpaceId);
          for (const childId of children) {
            if (!visitedSet.has(childId) && !queuedSet.has(childId)) {
              state.queue.push(childId);
              queuedSet.add(childId);
            }
          }
        }
        state.processedCount++;
      } catch (err: any) {
        state.errorCount++;
        state.lastError = err?.message || String(err);
        state.logs = appendLog(state.logs, `Error fetching ${pageId}: ${state.lastError}`);
      }

      sinceLastCheckpoint++;
      if (sinceLastCheckpoint >= CHECKPOINT_INTERVAL) {
        await persistIndexCheckpoint(state, pendingPayloads);
        pendingPayloads = [];
        sinceLastCheckpoint = 0;
      }
    }

    // Completed! Write final sitemap to Redis
    const siteMap: SiteMap = {
      site: cfg.site,
      pageMap: {},
      canonicalPageMap: state.canonicalPageMap,
    };
    pendingPayloads.push({ key: KEY_SITEMAP, value: siteMap });
    state.status = "completed";
    state.completedAt = Date.now();
    state.logs = appendLog(state.logs, `Completed! Indexed ${Object.keys(state.canonicalPageMap).length} pages.`);
    await persistIndexCheckpoint(state, pendingPayloads);
    return state;
  } catch (err: any) {
    state.status = "error";
    state.lastError = err?.message || String(err);
    state.logs = appendLog(state.logs, `Fatal error: ${state.lastError}`);
    await persistIndexCheckpoint(state, pendingPayloads);
    return state;
  }
}

/**
 * Idempotent, resumable pre-cache job step.
 * Populates Next.js runtime cache (unstable_cache) and optionally warms HTTP route cache.
 */
export async function runPrecacheJobStep(
  options: {
    restart?: boolean;
    timeBudgetMs?: number;
    forceFresh?: boolean;
    origin?: string;
  } = {},
): Promise<PrecacheJobState> {
  const { restart = false, timeBudgetMs = DEFAULT_TIME_BUDGET_MS, forceFresh = false, origin } = options;

  const cfg = await getRuntimeConfig();
  if (!cfg.rootNotionPageId) {
    throw new Error("rootNotionPageId is not configured");
  }

  let state = restart ? createEmptyPrecacheJob() : await getPrecacheJobState();

  if (restart || state.status === "idle" || state.status === "completed" || state.status === "error") {
    const siteMap: SiteMap | undefined = await db.get(KEY_SITEMAP);
    const canonicalPageMap = siteMap?.canonicalPageMap || {};
    const items: Array<{ slug: string; pageId: string }> = [{ slug: "", pageId: parsePageId(cfg.rootNotionPageId) }];
    for (const [slug, pageId] of Object.entries(canonicalPageMap)) {
      if (slug && slug !== "/" && pageId) {
        items.push({ slug, pageId });
      }
    }

    state = {
      ...createEmptyPrecacheJob(),
      status: "running",
      startedAt: Date.now(),
      updatedAt: Date.now(),
      pendingItems: items,
      totalCount: items.length,
      logs: appendLog([], `Started pre-cache job (${items.length} page(s))`),
    };
    await db.set(KEY_JOB_PRECACHE, state);
  } else {
    state.status = "running";
    state.logs = appendLog(state.logs, `Resumed pre-cache job (${state.pendingItems.length} remaining)`);
    await db.set(KEY_JOB_PRECACHE, state);
  }

  const startTime = Date.now();
  let sinceLastCheckpoint = 0;

  try {
    while (state.pendingItems.length > 0) {
      if (timeBudgetMs > 0 && Date.now() - startTime >= timeBudgetMs) {
        state.status = "paused";
        state.logs = appendLog(
          state.logs,
          `Time budget reached (${timeBudgetMs}ms). ${state.pendingItems.length} remaining.`,
        );
        state.updatedAt = Date.now();
        await db.set(KEY_JOB_PRECACHE, state);
        return state;
      }

      const item = state.pendingItems.shift()!;
      try {
        await getPage(item.pageId, { forceFresh, slug: item.slug || "/" });
        if (origin) {
          const urlPath = item.slug ? `/${item.slug.split("/").map(encodeURIComponent).join("/")}` : "/";
          await fetch(`${origin}${urlPath}`, {
            headers: { "x-precache": "1" },
          }).catch(() => null);
        }
        state.completedCount++;
      } catch (err: any) {
        const msg = err?.message || String(err);
        state.failedItems.push({ ...item, error: msg });
        state.lastError = msg;
        state.logs = appendLog(state.logs, `Failed /${item.slug}: ${msg}`);
      }

      sinceLastCheckpoint++;
      if (sinceLastCheckpoint >= CHECKPOINT_INTERVAL) {
        state.updatedAt = Date.now();
        await db.set(KEY_JOB_PRECACHE, state);
        sinceLastCheckpoint = 0;
      }
    }

    state.status = "completed";
    state.completedAt = Date.now();
    state.updatedAt = Date.now();
    state.logs = appendLog(
      state.logs,
      `Pre-cache completed (${state.completedCount}/${state.totalCount}, failed=${state.failedItems.length}).`,
    );
    await db.set(KEY_JOB_PRECACHE, state);
    return state;
  } catch (err: any) {
    state.status = "error";
    state.lastError = err?.message || String(err);
    state.updatedAt = Date.now();
    state.logs = appendLog(state.logs, `Fatal error: ${state.lastError}`);
    await db.set(KEY_JOB_PRECACHE, state);
    return state;
  }
}
