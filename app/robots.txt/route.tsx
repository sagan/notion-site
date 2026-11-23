import type { NextRequest } from "next/server";

import { getRuntimeConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const cfg = await getRuntimeConfig();
  return new Response(
    `User-agent: *
Allow: /
Disallow: /api/get-tweet-ast/*
Disallow: /api/search-notion
Disallow: /$admin

Sitemap: ${cfg.host}/sitemap.xml
`,
    {
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Type": "text/plain",
      },
    },
  );
}
