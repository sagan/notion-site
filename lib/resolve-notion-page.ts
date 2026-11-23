import "server-only";
import { ExtendedRecordMap } from "notion-types";
import { parsePageId } from "notion-utils";
import * as types from "@/lib/types";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { db, PREFIX_PAGE } from "@/lib/db";
import { getPage } from "@/lib/notion";

export async function resolveNotionPage(rawPageId: string): Promise<types.Page> {
  console.log("resolve page", rawPageId);
  const cfg = await getRuntimeConfig();

  if (!cfg.rootNotionPageId) {
    if (!rawPageId || rawPageId === "index") {
      return {
        site: cfg.site,
        notConfigured: true,
      };
    }
    return {
      site: cfg.site,
      error: {
        message: "Site is not configured yet",
        statusCode: 404,
      },
    };
  }

  let pageId: string;
  let recordMap: ExtendedRecordMap;

  if (rawPageId && rawPageId !== "index") {
    pageId = parsePageId(rawPageId);
    if (!pageId) {
      const override = cfg.pageUrlOverrides[rawPageId] || cfg.pageUrlAdditions[rawPageId];
      if (override) {
        pageId = parsePageId(override);
      }
    }

    if (pageId) {
      recordMap = await getPage(pageId, { slug: rawPageId });
    } else {
      // handle mapping of user-friendly canonical page paths to Notion page IDs
      // e.g., /developer-x-entrepreneur versus /71201624b204481f862630ea25ce62fe
      pageId = await db.get(PREFIX_PAGE + rawPageId);
      if (pageId) {
        recordMap = await getPage(pageId, { slug: rawPageId });
      } else {
        return {
          site: cfg.site,
          error: {
            message: `Not found "${rawPageId}"`,
            statusCode: 404,
          },
        };
      }
    }
  } else {
    pageId = cfg.rootNotionPageId;
    recordMap = await getPage(pageId, { slug: "/" });
  }

  return { site: cfg.site, recordMap, pageId, timestamp: new Date() };
}
