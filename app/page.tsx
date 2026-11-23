import * as React from "react";
import { Metadata } from "next";
import { NotionPage } from "@/components/NotionPage";
import { resolveNotionPage } from "@/lib/resolve-notion-page";
import { getPageMetadata } from "@/lib/get-page-metadata";
import { getRuntimeConfig, toPublicSiteConfig } from "@/lib/runtime-config";

export const maxDuration = 60;
export const dynamic = "force-static";
export const dynamicParams = true;

export async function generateMetadata(): Promise<Metadata> {
  const props = await resolveNotionPage("");
  if (props.notConfigured) {
    const cfg = await getRuntimeConfig();
    return { title: cfg.name || "Notion Site" };
  }
  return getPageMetadata(props);
}

export default async function NotionDomainPage() {
  console.log("/");
  const [props, cfg] = await Promise.all([resolveNotionPage(""), getRuntimeConfig()]);
  return <NotionPage {...props} siteConfig={toPublicSiteConfig(cfg)} />;
}
