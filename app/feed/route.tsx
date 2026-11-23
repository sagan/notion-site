import type { NextRequest } from "next/server";
import { ExtendedRecordMap } from "notion-types";
import { getBlockParentPage, getBlockTitle, getPageProperty, parsePageId, getBlockValue } from "notion-utils";
import RSS from "rss";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { getSiteMap } from "@/lib/site-map";
import { getSocialImageUrl } from "@/lib/get-social-image-url";
import { getCanonicalPageUrl } from "@/lib/map-page-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const ttlMinutes = 24 * 60; // 24 hours
  const ttlSeconds = ttlMinutes * 60;
  const config = await getRuntimeConfig();

  const feed = new RSS({
    title: config.name,
    site_url: config.host,
    feed_url: `${config.host}/feed.xml`,
    language: config.language,
    ttl: ttlMinutes,
  });

  const siteMap = await getSiteMap();
  for (const pagePath of Object.keys(siteMap.canonicalPageMap)) {
    const pageId = siteMap.canonicalPageMap[pagePath];
    const recordMap = siteMap.pageMap[pageId] as ExtendedRecordMap;
    if (!recordMap) continue;

    const keys = Object.keys(recordMap?.block || {});
    const block = getBlockValue(recordMap?.block?.[keys[0]]);
    if (!block) continue;

    const parentPage = getBlockParentPage(block, recordMap);
    const isBlogPost =
      block.type === "page" &&
      block.parent_table === "collection" &&
      parentPage?.id === parsePageId(config.rootNotionPageId);
    if (!isBlogPost) {
      continue;
    }

    const title = getBlockTitle(block, recordMap) || config.name;
    const description = getPageProperty<string>("Description", block, recordMap) || config.description;
    const url = getCanonicalPageUrl(config.site, recordMap)(pageId);
    const lastUpdatedTime = getPageProperty<number>("Last Updated", block, recordMap);
    const publishedTime = getPageProperty<number>("Published", block, recordMap);
    const date = lastUpdatedTime ? new Date(lastUpdatedTime) : publishedTime ? new Date(publishedTime) : undefined;
    const socialImageUrl = getSocialImageUrl(pageId);

    feed.item({
      title,
      url,
      date,
      description,
      enclosure: socialImageUrl
        ? {
            url: socialImageUrl,
            type: "image/jpeg",
          }
        : undefined,
    });
  }

  const feedText = feed.xml({ indent: true });
  return new Response(feedText, {
    headers: {
      "Cache-Control": `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`,
      "Content-Type": "application/xml",
    },
  });
}
