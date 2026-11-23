import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { ExtendedRecordMap, SearchParams, SearchResults } from "notion-types";
import { mergeRecordMaps, uuidToId } from "notion-utils";
import pMap from "p-map";
import { notion } from "./notion-api";
import { getRuntimeConfig } from "./runtime-config";
import { getPreviewImageMap } from "./preview-images";
import { getTweetsMap } from "./get-tweets";
import { NavigationLink } from "./site-config";

async function getNavigationLinkPages(
  navigationStyle: string,
  navigationLinks: NavigationLink[],
): Promise<ExtendedRecordMap[]> {
  const navigationLinkPageIds = (navigationLinks || []).map((link) => link.pageId).filter(Boolean);

  if (navigationStyle !== "default" && navigationLinkPageIds.length) {
    return pMap(
      navigationLinkPageIds,
      async (navigationLinkPageId) =>
        notion.getPage(navigationLinkPageId, {
          chunkLimit: 1,
          fetchMissingBlocks: false,
          fetchCollections: false,
          signFileUrls: false,
        }),
      {
        concurrency: 4,
      },
    );
  }

  return [];
}

function pageTag(pageId: string): string {
  return `notion-page:${uuidToId(pageId) || pageId}`;
}

export function buildSlugTags(slug?: string): string[] {
  const tags = new Set<string>(["/"]);
  if (!slug) {
    return Array.from(tags);
  }
  const cleaned = slug.replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned === "index") {
    return Array.from(tags);
  }
  const parts = cleaned.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    if (Buffer.byteLength(acc, "utf8") <= 256) {
      tags.add(acc);
    }
  }
  return Array.from(tags).slice(0, 60);
}

async function getCachedPage(
  cleanPageId: string,
  collectionReducerLimit?: number,
  slug?: string,
): Promise<ExtendedRecordMap> {
  const tags = Array.from(new Set([...buildSlugTags(slug), "notion-pages", pageTag(cleanPageId)])).slice(0, 64);

  const fn = unstable_cache(
    async () => getPageImpl(cleanPageId, { collectionReducerLimit }),
    ["notion-page", cleanPageId, String(collectionReducerLimit ?? 200)],
    {
      tags,
    },
  );
  return fn();
}

export async function getPage(
  pageId: string,
  options: {
    forceFresh?: boolean;
    collectionReducerLimit?: number;
    slug?: string;
  } = {},
): Promise<ExtendedRecordMap> {
  const { forceFresh = false, collectionReducerLimit, slug } = options;
  const cleanId = uuidToId(pageId) || pageId;

  if (forceFresh) {
    const recordMap = await getPageImpl(cleanId, { collectionReducerLimit });
    revalidateTag(pageTag(cleanId), { expire: 0 });
    return recordMap;
  }

  return getCachedPage(cleanId, collectionReducerLimit, slug);
}

export async function getPageImpl(
  pageId: string,
  options: { collectionReducerLimit?: number } = {},
): Promise<ExtendedRecordMap> {
  console.log("notion getPage", pageId);
  const cfg = await getRuntimeConfig();
  // signed url expires in at most 1 hour (next o'clock).
  // However, page data is cached by Next.js runtime cache.
  // So we sign urls on the fly during page load in client side, see <NotionPage />
  const collectionReducerLimit = options.collectionReducerLimit ?? 200;
  let recordMap = await notion.getPage(pageId, {
    signFileUrls: false,
    collectionReducerLimit,
  });

  // https://www.v2ex.com/t/912310
  // https://github.com/transitive-bullshit/nextjs-notion-starter-kit/issues/279#issuecomment-1245467818
  if (recordMap && recordMap["signed_urls"]) {
    const signed_urls = recordMap["signed_urls"];
    const new_signed_urls = {};
    for (const p in signed_urls) {
      if (signed_urls[p] && signed_urls[p].includes(".amazonaws.com/")) {
        console.log("skip : " + signed_urls[p]);
        continue;
      }
      new_signed_urls[p] = signed_urls[p];
    }
    recordMap["signed_urls"] = new_signed_urls;
  }

  if (cfg.navigationStyle !== "default") {
    const navigationLinkRecordMaps = await getNavigationLinkPages(cfg.navigationStyle, cfg.navigationLinks);

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) => mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap,
      );
    }
  }

  if (cfg.isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(recordMap);
    (recordMap as any).preview_images = previewImageMap;
  }

  await getTweetsMap(recordMap);

  return recordMap;
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params);
}
