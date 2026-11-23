import type { NavigationLink } from "./site-config";
import type { NavigationStyle } from "./types";

export interface PublicSiteConfig {
  rootNotionPageId: string;
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
  defaultPageIcon: string | null;
  defaultPageCover: string | null;
  defaultPageCoverPosition: number;
  navigationStyle: NavigationStyle;
  navigationLinks: Array<NavigationLink>;
  showPageSocial: boolean;
  isSearchEnabled: boolean;
  host: string;
}

export const defaultPublicSiteConfig: PublicSiteConfig = {
  rootNotionPageId: "",
  name: "Notion Site",
  shortName: "Notion Site",
  domain: "localhost",
  author: "me",
  description: "Notion Blog",
  language: "en",
  twitter: null,
  mastodon: null,
  github: null,
  youtube: null,
  linkedin: null,
  newsletter: null,
  zhihu: null,
  privacyPolicy: null,
  googleAnalyticsId: null,
  defaultPageIcon: null,
  defaultPageCover: null,
  defaultPageCoverPosition: 0.5,
  navigationStyle: "default",
  navigationLinks: [],
  showPageSocial: false,
  isSearchEnabled: true,
  host: "http://localhost:3000",
};

export function getMastodonHandle(mastodon?: string | null): string | null {
  if (!mastodon) {
    return null;
  }
  try {
    const url = new URL(mastodon);
    return `${url.pathname.slice(1)}@${url.hostname}`;
  } catch {
    return null;
  }
}
