import * as React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotionPage } from "@/components/NotionPage";
import { resolveNotionPage } from "@/lib/resolve-notion-page";
import { getPageMetadata } from "@/lib/get-page-metadata";
import * as types from "@/lib/types";
import { getRuntimeConfig, toPublicSiteConfig } from "@/lib/runtime-config";
import { getPageSpaceId } from "@/lib/get-page-space-id";

export const maxDuration = 60;

export const dynamic = "force-static";
export const dynamicParams = true;

// called concurrent with default page rendering
export async function generateMetadata({ params }: types.NextPageProps): Promise<Metadata> {
  const pathParams = await params;
  const slug = parseSlug(pathParams.pageId);
  const props = await resolveNotionPage(slug);
  return getPageMetadata(props);
}

// No build-time pre-generation; all Notion pages are fetched & cached on-demand at runtime
export async function generateStaticParams() {
  return [];
}

export default async function NotionDomainDynamicPage({ params }: types.NextPageProps) {
  const pathParams = await params;
  const slug = parseSlug(pathParams.pageId);
  console.log(`/[pageId]: path=${JSON.stringify(pathParams.pageId)} slug=${slug}`);
  const [page, cfg] = await Promise.all([resolveNotionPage(slug), getRuntimeConfig()]);
  if (!page.pageId || !page.recordMap) {
    notFound();
  }
  const pageSpaceId = getPageSpaceId(page);
  if (cfg.rootNotionSpaceId && cfg.rootNotionSpaceId != pageSpaceId) {
    console.log(`reject different space ${pageSpaceId} page`);
    notFound();
  }
  return <NotionPage {...page} siteConfig={toPublicSiteConfig(cfg)} />;
}

function parseSlug(pageId: string[]): string {
  let slug = (pageId || []).join("/");
  try {
    // vercel + nextjs dynamic route env passes url-encoded pageId,
    // whereas local node.js next server does not
    slug = decodeURIComponent(slug);
  } catch (e) {}
  return slug;
}
