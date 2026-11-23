import { ExtendedRecordMap } from "notion-types";
import {
  getBlockTitle,
  getBlockCollectionId,
  getPageBreadcrumbs,
  getTextContent,
  getPageProperty,
  parsePageId,
  uuidToId,
  getBlockValue,
} from "notion-utils";

import {
  inversePageUrlOverrides as defaultInversePageUrlOverrides,
  rootNotionPageId as defaultRootNotionPageId,
} from "./config";
import { PageUrlOverridesInverseMap } from "./types";
import { truncateToUtf8Bytes } from "./util";

export interface CanonicalPageIdOptions {
  rootNotionPageId?: string;
  inversePageUrlOverrides?: PageUrlOverridesInverseMap;
}

// \b checks if the current (not previous or next!) position is a word boundary
// a word character includes: [a-zA-Z0-9_]
// so /\b#meta/ will always fail to match any string because the "#" is not a word character.
const metaRegex = /(\s|,|^)#meta(\s|,|$)/;

// From https://github.com/NotionX/react-notion-x/tree/master/packages/notion-utils/src .
// It differs from original version of notion-utils that:
// 1. remove most sanitizations.
// 2. replace space with underscore (_) instead of dash (-), it's the mediawiki way.
const normalizeTitle = (title?: string | null): string => {
  return (title || "").trim().replace(/\s/g, "_").replace(/\//g, "／");
};

// override getCanonicalPageId from notion-utils
const getCanonicalPageIdImpl = (
  pageId: string,
  recordMap: ExtendedRecordMap,
  rootNotionPageId: string,
): string | null => {
  if (!pageId || !recordMap) return null;

  const id = uuidToId(pageId);
  const block = getBlockValue(recordMap.block[pageId]);

  if (rootNotionPageId && id == rootNotionPageId) {
    return "/"; // only root page slug has preceding /
  }

  if (block) {
    // [{title, active, pageId, block: {id, type: "page", properties, ...}}]
    let breadcrumbs = getPageBreadcrumbs(recordMap, pageId);
    const rootPageIndex = rootNotionPageId
      ? breadcrumbs.findIndex((v) => {
          return uuidToId(v.block.id) === rootNotionPageId;
        })
      : -1;
    if (rootPageIndex != -1) {
      breadcrumbs = breadcrumbs.slice(rootPageIndex + 1);
    }
    let slugs = breadcrumbs
      .filter(({ block }, i) => {
        if (i < breadcrumbs.length - 1) {
          // If a item/collection title & desc contains "#meta" hashtag, exclude it's name from url slugs
          const title = getBlockTitle(block, recordMap);
          if (title && title.match(metaRegex)) {
            return false;
          }
          const description = getBlockDescription(block, recordMap);
          if (description && description.match(metaRegex)) {
            return false;
          }
        }
        return true;
      })
      .map(({ block }) => getPageSlug(block, recordMap));
    if (slugs.length > 0) {
      if (isNormalSlug(slugs[slugs.length - 1])) {
        slugs = [...slugs.slice(0, -1).filter(isNormalSlug), slugs[slugs.length - 1]];
      }
    } else {
      slugs.push(id);
    }
    return slugs.join("/");
  }
  return id;
};

export function getCanonicalPageId(
  pageId: string,
  recordMap: ExtendedRecordMap,
  options?: CanonicalPageIdOptions,
): string | null {
  const cleanPageId = parsePageId(pageId, { uuid: false });
  if (!cleanPageId) {
    return null;
  }

  const overrides = options?.inversePageUrlOverrides ?? defaultInversePageUrlOverrides;
  const rootId = options?.rootNotionPageId ?? defaultRootNotionPageId;

  const override = overrides[cleanPageId];
  if (override) {
    return override;
  } else {
    return getCanonicalPageIdImpl(pageId, recordMap, rootId);
  }
}

function isNormalSlug(slug: string): boolean {
  return !slug.startsWith("_") && !slug.startsWith("@");
}

function getPageSlug(block: any, recordMap: ExtendedRecordMap): string {
  let slug =
    (getPageProperty("slug", block, recordMap) as string) ||
    (getPageProperty("Slug", block, recordMap) as string) ||
    "";
  const description = getBlockDescription(block, recordMap);
  if (description) {
    // Override a database page title from description syntax: `#slug:Foo_Bar`
    const match = description.match(/(\s|,|^)#slug:(.+?)(\s|,|$)/);
    if (match) {
      slug = match[2];
    }
  }
  if (!slug) {
    slug = getBlockTitle(block, recordMap);
    // if title is in "foo / bar" format, use "foo" as slug.
    const match = slug.match(/^(.+?)[\s]+\/[\s]/);
    if (match) {
      slug = match[1];
    }
  }
  if (slug) {
    slug = normalizeTitle(slug);
    // In vercel & next, pages pre-compiled to "/vercel/path0/.next/server/app/<slug>" static file during build
    // the whole path length (utf-8) must be <= 255 bytes.
    // "/vercel/path0/.next/server/app/" : 31 bytes.
    // So the slug must be <= 224 bytes.
    // It's a workaround.
    // @todo: use dynamic routing and skip static generation for long-title pages.
    slug = truncateToUtf8Bytes(slug, 224);
  }
  if (!slug) {
    slug = uuidToId(block.id);
  }
  return slug;
}

/**
 * Currently, only a (full) database page has description.
 * @param block
 * @param recordMap
 * @returns
 */
function getBlockDescription(block: any, recordMap: ExtendedRecordMap): string {
  if (block.type == "collection_view_page") {
    const collectionId = getBlockCollectionId(block, recordMap);
    if (collectionId) {
      return getTextContent(getBlockValue(recordMap.collection[collectionId])?.["description"]) || "";
    }
  }
  return "";
}
