import type { Metadata } from "next";
import * as types from "@/lib/types";
import { isDev } from "@/lib/config";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { getSocialImageUrl } from "@/lib/get-social-image-url";
import { getBlockTitle, getPageProperty, getBlockValue } from "notion-utils";
import { getCanonicalPageUrl } from "./map-page-url";
import { mapImageUrl } from "./map-image-url";

export async function getPageMetadata({ recordMap, pageId }: types.Page): Promise<Metadata> {
  const cfg = await getRuntimeConfig();
  let title = "";
  let description = "";
  let url = "";
  let image = "";
  const keys = Object.keys(recordMap?.block || {});
  const block = getBlockValue(recordMap?.block?.[keys[0]]);
  if (block) {
    title = getBlockTitle(block, recordMap) || cfg.name;
    description = getPageProperty<string>("Description", block, recordMap) || cfg.description;
    url = !isDev && getCanonicalPageUrl(cfg.site, recordMap)(pageId);
    image = mapImageUrl(
      getPageProperty<string>("Social Image", block, recordMap) ||
        (block as types.PageBlock).format?.page_cover ||
        cfg.defaultPageCover,
      block,
    );
  }

  if (cfg.name) {
    if (pageId === cfg.rootNotionPageId || !title) {
      title = cfg.name;
    } else {
      title += " - " + cfg.name;
    }
  }
  description = description ?? cfg.description;
  const socialImageUrl = getSocialImageUrl(pageId) || image;
  const metadata: Metadata = {
    title,
    description,
    alternates: Object.assign({}, url ? { canonical: url } : null),
    openGraph: Object.assign(
      { description },
      title ? { title } : null,
      url ? { url } : null,
      socialImageUrl ? { images: { url: socialImageUrl } } : null,
    ),
    twitter: Object.assign(
      {
        card: socialImageUrl ? "summary_large_image" : "summary",
        description,
      },
      title ? { title } : null,
      url ? { url } : null,
      socialImageUrl ? { images: { url: socialImageUrl } } : null,
    ),
  };
  return metadata;
}
