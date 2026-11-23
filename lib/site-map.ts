import "server-only";
import { getAllPagesInSpace, getPageProperty, getBlockValue } from "notion-utils";
import * as types from "./types";
import { getRuntimeConfig } from "./runtime-config";
import { getCanonicalPageId } from "./get-canonical-page-id";
import { getPage as getNotionPage } from "./notion";
import { db, dbBatchSet, KEY_SITEMAP, PREFIX_PAGE, SetPayload } from "@/lib/db";

export async function getSiteMap(): Promise<types.SiteMap> {
  const cfg = await getRuntimeConfig();
  const siteMap: types.SiteMap = await db.get(KEY_SITEMAP);
  if (!siteMap) {
    return { site: cfg.site, pageMap: {}, canonicalPageMap: {} };
  }
  return siteMap;
}

// Can be triggered at runtime via admin job
export async function buildSiteMap(): Promise<types.SiteMap> {
  const cfg = await getRuntimeConfig();
  const rootNotionPageId = cfg.rootNotionPageId;
  const rootNotionSpaceId = cfg.rootNotionSpaceId;
  console.log(`buildSiteMap`, rootNotionPageId, rootNotionSpaceId);

  if (!rootNotionPageId) {
    return { site: cfg.site, pageMap: {}, canonicalPageMap: {} };
  }

  const getPage = async (pageId: string) => {
    return getNotionPage(pageId);
  };

  console.log("call getAllPagesInSpace");
  const pageMap = await getAllPagesInSpace(rootNotionPageId, rootNotionSpaceId, getPage, { concurrency: 2 });
  console.log("gotPageMap");
  for (const pageId of cfg.extraRootNotionPageIds) {
    const extraPageMap = await getAllPagesInSpace(pageId, rootNotionSpaceId, getPage, { concurrency: 2 });
    Object.assign(pageMap, extraPageMap);
  }

  const canonicalPageMap = Object.keys(pageMap).reduce((map, pageId: string) => {
    const recordMap = pageMap[pageId];
    if (!recordMap) {
      console.warn(`warning: skipping unresolvable page "${pageId}"`);
      return map;
    }

    const block = getBlockValue(recordMap.block?.[pageId]);
    if (!block) {
      console.warn(`warning: skipping page "${pageId}" with missing root block`);
      return map;
    }
    if (!(getPageProperty<boolean | null>("Public", block, recordMap) ?? true)) {
      return map;
    }

    const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
      rootNotionPageId: cfg.rootNotionPageId,
      inversePageUrlOverrides: cfg.inversePageUrlOverrides,
    });

    if (map[canonicalPageId]) {
      console.warn("error duplicate canonical page id", {
        canonicalPageId,
        pageId,
        existingPageId: map[canonicalPageId],
      });
      return map;
    } else {
      return {
        ...map,
        [canonicalPageId]: pageId,
      };
    }
  }, {});

  return { site: cfg.site, pageMap, canonicalPageMap };
}

let updatingPageId = "";

/**
 * dynamic update site map on each page rendering or refresh.
 * @return updated slug -> id map
 */
export async function updateSiteMap(
  pageId: string,
  recordMap: types.ExtendedRecordMap,
): Promise<{ [pageId: string]: string }> {
  if (updatingPageId) {
    console.log("already updating site map", updatingPageId);
    return {};
  }
  updatingPageId = pageId;
  const slugIdMap = {};
  try {
    const cfg = await getRuntimeConfig();
    const payloads: SetPayload[] = [];
    for (const key of Object.keys(recordMap.block)) {
      if (getBlockValue(recordMap.block[key])?.type != "page") {
        continue;
      }
      const canonicalPageId = getCanonicalPageId(key, recordMap, {
        rootNotionPageId: cfg.rootNotionPageId,
        inversePageUrlOverrides: cfg.inversePageUrlOverrides,
      });
      if (!canonicalPageId) {
        continue;
      }
      payloads.push({ key: PREFIX_PAGE + canonicalPageId, value: key });
      slugIdMap[canonicalPageId] = key;
    }
    await dbBatchSet(...payloads);
    console.log(`updateSiteMap done updated ${payloads.length} pages`);
  } catch (e) {}
  updatingPageId = "";
  return slugIdMap;
}

/**
 * generate sitemap.xml contents
 */
export async function createSitemap(siteMap: types.SiteMap): Promise<string> {
  const cfg = await getRuntimeConfig();
  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${cfg.host}</loc>
    </url>

    <url>
      <loc>${cfg.host}/</loc>
    </url>

    ${(Object.keys(siteMap.canonicalPageMap) || [])
      .map((canonicalPagePath) =>
        `
          <url>
            <loc>${cfg.host}/${canonicalPagePath}</loc>
          </url>
        `.trim(),
      )
      .join("")}
  </urlset>
`;
}
