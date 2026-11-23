"use client";

import React from "react";
import { defaultPublicSiteConfig, type PublicSiteConfig } from "@/lib/public-config";

const SiteConfigContext = React.createContext<PublicSiteConfig>(defaultPublicSiteConfig);

export function SiteConfigProvider({ value, children }: { value?: PublicSiteConfig; children: React.ReactNode }) {
  return <SiteConfigContext.Provider value={value || defaultPublicSiteConfig}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): PublicSiteConfig {
  return React.useContext(SiteConfigContext);
}
