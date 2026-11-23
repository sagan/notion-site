import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { getSiteMap } from "@/lib/site-map";
import { escapePageId } from "@/lib/util";

function normalizeCacheTag(rawTarget?: string): string {
  const input = (rawTarget || "").trim();
  if (!input || input === "/") {
    return "/";
  }

  let path = input;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname;
    } catch {}
  }

  try {
    path = decodeURIComponent(path);
  } catch {}

  const cleaned = path.replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned === "index") {
    return "/";
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tag = normalizeCacheTag(body?.target);

  revalidateTag(tag, { expire: 0 });
  let cloudflare;
  if (tag === "/") {
    revalidateTag("notion-pages", { expire: 0 });
    revalidatePath("/", "layout");
    cloudflare = await purgeCloudflareCache({ all: true });
  } else {
    const siteMap = await getSiteMap();
    const pathSet = new Set<string>([`/${escapePageId(tag)}`]);
    for (const slug of Object.keys(siteMap.canonicalPageMap || {})) {
      if (slug === tag || slug.startsWith(`${tag}/`)) {
        const p = `/${escapePageId(slug)}`;
        revalidatePath(p);
        pathSet.add(p);
      }
    }
    cloudflare = await purgeCloudflareCache({ paths: Array.from(pathSet) });
  }

  return NextResponse.json({
    ok: true,
    tag,
    cloudflare,
    timestamp: Date.now(),
  });
}
