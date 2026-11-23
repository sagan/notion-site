import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";
import {
  getIndexJobState,
  getPrecacheJobState,
  resetIndexJob,
  resetPrecacheJob,
  runIndexJobStep,
  runPrecacheJobStep,
} from "@/lib/admin-jobs";
import { getSiteMap } from "@/lib/site-map";

export const maxDuration = 60;

function summarizeIndexJob(job: Awaited<ReturnType<typeof getIndexJobState>>) {
  return {
    status: job.status,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    queueLength: job.queue.length,
    visitedCount: job.visited.length,
    indexedCount: Object.keys(job.canonicalPageMap || {}).length,
    processedCount: job.processedCount,
    errorCount: job.errorCount,
    lastError: job.lastError,
    logs: job.logs,
  };
}

function summarizePrecacheJob(job: Awaited<ReturnType<typeof getPrecacheJobState>>) {
  return {
    status: job.status,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    remainingCount: job.pendingItems.length,
    completedCount: job.completedCount,
    totalCount: job.totalCount,
    failedCount: job.failedItems.length,
    failedItems: job.failedItems.slice(0, 20),
    lastError: job.lastError,
    logs: job.logs,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [indexJob, precacheJob, siteMap] = await Promise.all([getIndexJobState(), getPrecacheJobState(), getSiteMap()]);
  return NextResponse.json({
    indexJob: summarizeIndexJob(indexJob),
    precacheJob: summarizePrecacheJob(precacheJob),
    sitemapCount: Object.keys(siteMap.canonicalPageMap || {}).length,
  });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const type = body?.type;
  const action = body?.action || "run";
  const forceFresh = Boolean(body?.forceFresh);
  const warmRoutes = Boolean(body?.warmRoutes);
  const timeBudgetMs = typeof body?.timeBudgetMs === "number" ? body.timeBudgetMs : undefined;

  try {
    if (type === "index") {
      if (action === "reset") {
        const job = await resetIndexJob();
        return NextResponse.json({ indexJob: summarizeIndexJob(job) });
      }
      const job = await runIndexJobStep({
        restart: action === "restart",
        timeBudgetMs,
        forceFresh,
      });
      return NextResponse.json({ indexJob: summarizeIndexJob(job) });
    }

    if (type === "precache") {
      if (action === "reset") {
        const job = await resetPrecacheJob();
        return NextResponse.json({ precacheJob: summarizePrecacheJob(job) });
      }
      const origin = warmRoutes ? new URL(req.url).origin : undefined;
      const job = await runPrecacheJobStep({
        restart: action === "restart",
        timeBudgetMs,
        forceFresh,
        origin,
      });
      return NextResponse.json({ precacheJob: summarizePrecacheJob(job) });
    }

    return NextResponse.json({ error: "Invalid job type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Job execution failed" }, { status: 500 });
  }
}
