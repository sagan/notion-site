import * as types from "./types";

export interface SiteConfig {
  rootNotionPageId: string;
  rootNotionSpaceId?: string;
  extraRootNotionPageIds?: string[];

  name: string;
  shortName: string;
  domain: string;
  author: string;
  description?: string;
  language?: string;
  token?: string;

  twitter?: string;
  github?: string;
  linkedin?: string;
  newsletter?: string;
  youtube?: string;
  zhihu?: string;
  mastodon?: string;

  privacyPolicy?: string | null;
  googleAnalyticsId?: string | null;
  disqusShortname?: string | null;

  defaultPageIcon?: string | null;
  defaultPageCover?: string | null;
  defaultPageCoverPosition?: number | null;
  faviconUrl?: string | null;

  isPreviewImageSupportEnabled?: boolean;
  isTweetEmbedSupportEnabled?: boolean;
  isRedisEnabled?: boolean;
  isSearchEnabled?: boolean;
  showPageSocial?: boolean;
  showGitHubShareButton?: boolean;

  pageUrlOverrides?: types.PageUrlOverridesMap;
  pageUrlAdditions?: types.PageUrlOverridesMap;

  navigationStyle?: types.NavigationStyle;
  navigationLinks?: Array<NavigationLink>;
}

export interface NavigationLink {
  title: string;
  pageId?: string;
  url?: string;
}

export const siteConfig = (config: SiteConfig): SiteConfig => {
  return config;
};
