import type { NextRequest } from "next/server";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { getSiteMap } from "@/lib/site-map";
import type { SiteMap } from "@/lib/types";
import { escapePageId } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const [siteMap, cfg] = await Promise.all([getSiteMap(), getRuntimeConfig()]);
  return new Response(createSitemap(siteMap, cfg.host), {
    headers: {
      "Cache-Control": "public, max-age=28800, stale-while-revalidate=28800",
      "Content-Type": "application/xml",
    },
  });
}

function createSitemap(siteMap: SiteMap, host: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${host}</loc>
    </url>

    <url>
      <loc>${host}/</loc>
    </url>

    ${(Object.keys(siteMap.canonicalPageMap) || [])
      .map((canonicalPagePath) =>
        `
          <url>
            <loc>${host}/${escapePageId(canonicalPagePath)}</loc>
          </url>
        `.trim(),
      )
      .join("")}
  </urlset>
`;
}
