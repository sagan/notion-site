import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getPageTitle, parsePageId, uuidToId } from "notion-utils";
import { db, PREFIX_PAGE } from "@/lib/db";
import { getPage } from "@/lib/notion";
import { updateSiteMap } from "@/lib/site-map";
import { parseRequestParams } from "@/lib/parse-request-params";
import { escapePageId } from "@/lib/util";
import { compareToken } from "@/lib/token";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { purgeCloudflareCache } from "@/lib/cloudflare";

export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = await parseRequestParams(req);
  return doWork(req, params);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const params = await parseRequestParams(req);
  return doWork(req, params);
}

/**
 * Purge / Refresh the cache
 * @param params request params:
 * token: (required) auth token.
 * slug: page slug (e.g. "My Page/Sub Page") or id or uuid, it will clear corresponding path cache. default to "/"
 *  all: boolean flag. if set, will clear layout (global) cache instead of page cache.
 * relatives: boolean flag. if set, will clear all path cache of relative pages of id page.
 * @returns
 */
async function doWork(req: NextRequest, params: URLSearchParams): Promise<NextResponse> {
  const TOKEN = process.env.TOKEN || "";
  const token = params.get("token") || "";
  if (!isAdminRequestAuthorized(req) && (!TOKEN || !compareToken(token, TOKEN))) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  if (params.get("all")) {
    revalidateTag("notion-pages", { expire: 0 });
    revalidateTag("site-config", { expire: 0 });
    revalidatePath("/", "layout");
    const cloudflare = await purgeCloudflareCache({ all: true });
    return NextResponse.json({ all: true, cloudflare, timestamp: Date.now() });
  }

  const pathes: { path: string; slug: string; uuid: string; title: string }[] = [];
  let slug = params.get("slug") || "";
  let path = "";
  let title = "";
  let uuid = parsePageId(slug);
  if (uuid) {
    slug = "";
  } else if (slug) {
    path = "/" + escapePageId(slug);
    uuid = await db.get(PREFIX_PAGE + slug);
  } else {
    const cfg = await getRuntimeConfig();
    path = "/";
    uuid = cfg.rootNotionPageId;
  }
  if (uuid) {
    try {
      const recordMap = await getPage(uuid, { forceFresh: true });
      title = getPageTitle(recordMap);
      const slugIdMap = await updateSiteMap(uuid, recordMap);
      if (!path) {
        for (const slug of Object.keys(slugIdMap)) {
          if (slugIdMap[slug] == uuid) {
            path = "/" + escapePageId(slug);
            break;
          }
        }
      }
      if (params.get("relatives")) {
        for (const slug of Object.keys(slugIdMap)) {
          if (slugIdMap[slug] != uuid) {
            pathes.push({ path: "/" + escapePageId(slug), uuid: slugIdMap[slug], slug, title: "" });
          }
        }
      }
    } catch (err: any) {
      console.error(`Refresh error for ${uuid}:`, err);
      return NextResponse.json(
        {
          error: `Refresh failed: ${err?.message || err}. Existing cache was preserved.`,
          uuid,
          slug,
        },
        { status: 502 },
      );
    }
  }
  pathes.unshift({ path, slug, uuid, title });

  const cfPaths: string[] = [];
  for (const path of pathes) {
    if (path.path) {
      revalidatePath(path.path);
      cfPaths.push(path.path);
    }
    if (path.uuid) {
      revalidatePath("/" + path.uuid);
      revalidatePath("/" + uuidToId(path.uuid));
      cfPaths.push("/" + path.uuid, "/" + uuidToId(path.uuid));
    }
  }
  const cloudflare = await purgeCloudflareCache({ paths: cfPaths });
  return NextResponse.json({ pathes, cloudflare, timestamp: Date.now() });
}
