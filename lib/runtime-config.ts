import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { parsePageId } from "notion-utils";
import rawSiteConfig from "../site.config";
import { cleanPageUrlMap, invertPageUrlOverrides, isDev, port } from "./config";
import { db, KEY_SITE_CONFIG } from "./db";
import { purgeCloudflareCache } from "./cloudflare";
import { NavigationLink, SiteConfig } from "./site-config";
import { NavigationStyle, PageUrlOverridesInverseMap, PageUrlOverridesMap, Site } from "./types";

export const SITE_CONFIG_CACHE_TAG = "site-config";

export interface RuntimeSiteConfig {
  rootNotionPageId: string;
  extraRootNotionPageIds: string[];
  rootNotionSpaceId: string | null;

  name: string;
  shortName: string;
  domain: string;
  author: string;
  description: string;
  language: string;

  twitter: string | null;
  mastodon: string | null;
  github: string | null;
  youtube: string | null;
  linkedin: string | null;
  newsletter: string | null;
  zhihu: string | null;

  privacyPolicy: string | null;
  googleAnalyticsId: string | null;
  disqusShortname: string | null;

  defaultPageIcon: string | null;
  defaultPageCover: string | null;
  defaultPageCoverPosition: number;
  faviconUrl: string | null;

  isPreviewImageSupportEnabled: boolean;
  navigationStyle: NavigationStyle;
  navigationLinks: Array<NavigationLink>;
  showPageSocial: boolean;
  isSearchEnabled: boolean;

  pageUrlOverrides: PageUrlOverridesMap;
  pageUrlAdditions: PageUrlOverridesMap;
  inversePageUrlOverrides: PageUrlOverridesInverseMap;

  host: string;
  site: Site;
}

export type PublicSiteConfig = Pick<
  RuntimeSiteConfig,
  | "rootNotionPageId"
  | "name"
  | "shortName"
  | "domain"
  | "author"
  | "description"
  | "language"
  | "twitter"
  | "mastodon"
  | "github"
  | "youtube"
  | "linkedin"
  | "newsletter"
  | "zhihu"
  | "privacyPolicy"
  | "googleAnalyticsId"
  | "defaultPageIcon"
  | "defaultPageCover"
  | "defaultPageCoverPosition"
  | "navigationStyle"
  | "navigationLinks"
  | "showPageSocial"
  | "isSearchEnabled"
  | "host"
>;

function buildRuntimeSiteConfig(stored?: Partial<SiteConfig> | null): RuntimeSiteConfig {
  const merged: SiteConfig = {
    ...rawSiteConfig,
    ...(stored || {}),
  };

  const rootNotionPageId = parsePageId(merged.rootNotionPageId || "", { uuid: false }) || "";
  const extraRootNotionPageIds = (merged.extraRootNotionPageIds || [])
    .map((id) => parsePageId(id, { uuid: false }))
    .filter(Boolean);
  const rootNotionSpaceId = parsePageId(merged.rootNotionSpaceId || null, { uuid: true }) || null;

  const domain = merged.domain || "localhost";
  const name = merged.name || "Notion Site";
  const shortName = merged.shortName || name;
  const author = merged.author || "me";
  const description = merged.description || "Notion Blog";
  const language = merged.language || "en";

  let pageUrlOverrides: PageUrlOverridesMap = {};
  let pageUrlAdditions: PageUrlOverridesMap = {};
  try {
    pageUrlOverrides = cleanPageUrlMap(merged.pageUrlOverrides || {}, {
      label: "pageUrlOverrides",
    });
  } catch (err) {
    console.warn("Invalid pageUrlOverrides in config:", err);
  }
  try {
    pageUrlAdditions = cleanPageUrlMap(merged.pageUrlAdditions || {}, {
      label: "pageUrlAdditions",
    });
  } catch (err) {
    console.warn("Invalid pageUrlAdditions in config:", err);
  }

  const inversePageUrlOverrides = invertPageUrlOverrides(pageUrlOverrides);
  const host = isDev ? `http://localhost:${port}` : `https://${domain}`;

  const site: Site = {
    domain,
    name,
    rootNotionPageId,
    rootNotionSpaceId,
    description,
    inversePageUrlOverrides,
  };

  return {
    rootNotionPageId,
    extraRootNotionPageIds,
    rootNotionSpaceId,
    name,
    shortName,
    domain,
    author,
    description,
    language,
    twitter: merged.twitter || null,
    mastodon: merged.mastodon || null,
    github: merged.github || null,
    youtube: merged.youtube || null,
    linkedin: merged.linkedin || null,
    newsletter: merged.newsletter || null,
    zhihu: merged.zhihu || null,
    privacyPolicy: merged.privacyPolicy || null,
    googleAnalyticsId: merged.googleAnalyticsId || null,
    disqusShortname: merged.disqusShortname || null,
    defaultPageIcon: merged.defaultPageIcon || null,
    defaultPageCover: merged.defaultPageCover || null,
    defaultPageCoverPosition: merged.defaultPageCoverPosition ?? 0.5,
    faviconUrl: merged.faviconUrl || null,
    isPreviewImageSupportEnabled: merged.isPreviewImageSupportEnabled ?? true,
    navigationStyle: merged.navigationStyle || "default",
    navigationLinks: merged.navigationLinks || [],
    showPageSocial: merged.showPageSocial ?? false,
    isSearchEnabled: merged.isSearchEnabled ?? true,
    pageUrlOverrides,
    pageUrlAdditions,
    inversePageUrlOverrides,
    host,
    site,
  };
}

export async function getRawStoredSiteConfig(): Promise<Partial<SiteConfig> | null> {
  try {
    const stored = await db.get(KEY_SITE_CONFIG);
    return stored && typeof stored === "object" ? stored : null;
  } catch (err) {
    console.warn("Failed to read site-config from db:", err);
    return null;
  }
}

export async function getRuntimeConfigUncached(): Promise<RuntimeSiteConfig> {
  const stored = await getRawStoredSiteConfig();
  return buildRuntimeSiteConfig(stored);
}

export const getRuntimeConfig = unstable_cache(async () => getRuntimeConfigUncached(), ["runtime-site-config"], {
  tags: [SITE_CONFIG_CACHE_TAG],
});

export async function saveRuntimeConfig(nextConfig: Partial<SiteConfig>): Promise<RuntimeSiteConfig> {
  // Validate pageUrlOverrides / pageUrlAdditions before persisting
  if (nextConfig.pageUrlOverrides) {
    cleanPageUrlMap(nextConfig.pageUrlOverrides, { label: "pageUrlOverrides" });
  }
  if (nextConfig.pageUrlAdditions) {
    cleanPageUrlMap(nextConfig.pageUrlAdditions, { label: "pageUrlAdditions" });
  }

  const existing = (await getRawStoredSiteConfig()) || {};
  const merged: Partial<SiteConfig> = {
    ...existing,
    ...nextConfig,
  };
  await db.set(KEY_SITE_CONFIG, merged);
  revalidateTag(SITE_CONFIG_CACHE_TAG, { expire: 0 });
  revalidateTag("favicon", { expire: 0 });
  revalidateTag("notion-pages", { expire: 0 });
  revalidatePath("/favicon.ico");
  revalidatePath("/favicon.png");
  revalidatePath("/favicon-192x192.png");
  revalidatePath("/manifest.json");
  revalidatePath("/", "layout");
  await purgeCloudflareCache({
    paths: ["/favicon.ico", "/favicon.png", "/favicon-192x192.png", "/manifest.json"],
  });
  return buildRuntimeSiteConfig(merged);
}

export function toPublicSiteConfig(cfg: RuntimeSiteConfig): PublicSiteConfig {
  return {
    rootNotionPageId: cfg.rootNotionPageId,
    name: cfg.name,
    shortName: cfg.shortName,
    domain: cfg.domain,
    author: cfg.author,
    description: cfg.description,
    language: cfg.language,
    twitter: cfg.twitter,
    mastodon: cfg.mastodon,
    github: cfg.github,
    youtube: cfg.youtube,
    linkedin: cfg.linkedin,
    newsletter: cfg.newsletter,
    zhihu: cfg.zhihu,
    privacyPolicy: cfg.privacyPolicy,
    googleAnalyticsId: cfg.googleAnalyticsId,
    defaultPageIcon: cfg.defaultPageIcon,
    defaultPageCover: cfg.defaultPageCover,
    defaultPageCoverPosition: cfg.defaultPageCoverPosition,
    navigationStyle: cfg.navigationStyle,
    navigationLinks: cfg.navigationLinks,
    showPageSocial: cfg.showPageSocial,
    isSearchEnabled: cfg.isSearchEnabled,
    host: cfg.host,
  };
}
