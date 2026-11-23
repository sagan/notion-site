"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import cs from "classnames";
// import { DiscussionEmbed } from 'disqus-react'
import { formatDate, getBlockTitle, getPageBreadcrumbs, getBlockValue } from "notion-utils";
import { NotionComponents, NotionRenderer, useNotionContext } from "react-notion-x";
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from "react-tweet";
import * as types from "@/lib/types";
import { type PublicSiteConfig } from "@/lib/public-config";
import { SiteConfigProvider, useSiteConfig } from "./SiteConfigContext";
import { getCanonicalPageId } from "@/lib/get-canonical-page-id";
import { mapImageUrl } from "@/lib/map-image-url";
import { mapPageUrl } from "@/lib/map-page-url";
import { searchNotion } from "@/lib/search-notion";
import { Footer } from "./Footer";
// import { Loading } from './Loading'
import { NotionPageHeader } from "./NotionPageHeader";
import { Page404 } from "./Page404";
import { PageAside } from "./PageAside";
import Code from "./Code";
import Modal from "./Modal";
import styles from "./styles.module.css";
import { addSignedUrlsToRecordMap, getRecordMapUnsignedFiles, isUnsignedUrl, signUrls } from "@/lib/sign";

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Pdf = dynamic(() => import("./Pdf"), {
  ssr: false,
});
const Collection = dynamic(() => import("react-notion-x/build/third-party/collection").then((m) => m.Collection));
const Equation = dynamic(() => import("react-notion-x/build/third-party/equation").then((m) => m.Equation));

function Tweet({ id }: { id: string }) {
  const { recordMap } = useNotionContext();
  const tweet = (recordMap as types.ExtendedTweetRecordMap)?.tweets?.[id];

  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      {tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />}
    </React.Suspense>
  );
}

function notionLinkOnClick(e: Event) {
  const el = e.currentTarget as HTMLAnchorElement;
  if (el.classList.contains("notion-file-link") && el.href && isUnsignedUrl(el.href)) {
    e.preventDefault();
    alert("File url is loading. Try to download it later");
  }
}
function isInternalUrl(href?: string, domain?: string): boolean {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const url = new URL(href);
    if (typeof window !== "undefined" && url.origin === window.location.origin) {
      return true;
    }
    if (domain && (url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
      return true;
    }
  } catch {}
  return false;
}

// override default react-notion-x Link component:
// for internal links, use Next.js <Link> for client-side fetch/ajax navigation.
// for external links, render <a> without target="_blank".
const NotionLink = (props: any) => {
  const { href, ...rest } = props;
  const siteConfig = useSiteConfig();
  if (isInternalUrl(href, siteConfig.domain)) {
    let to = href;
    try {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        const u = new URL(href);
        to = u.pathname + u.search + u.hash;
      }
    } catch {}
    return <Link href={to} prefetch={false} {...rest} onClick={notionLinkOnClick} />;
  }
  return <a rel="noopener noreferrer" {...props} onClick={notionLinkOnClick} />;
};
const NotionLinkMemo = React.memo(NotionLink);

const PageLink = (props: any) => <Link prefetch={false} {...props} />;
const PageLinkMemo = React.memo(PageLink);

const propertyLastEditedTimeValue = ({ block, pageHeader }, defaultFn: () => React.ReactNode) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: "long",
    })}`;
  }

  return defaultFn();
};

const propertyDateValue = ({ data, schema, pageHeader }, defaultFn: () => React.ReactNode) => {
  if (pageHeader && schema?.name?.toLowerCase() === "published") {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date;

    if (publishDate) {
      return `${formatDate(publishDate, {
        month: "long",
      })}`;
    }
  }

  return defaultFn();
};

const propertyTextValue = ({ schema, pageHeader }, defaultFn: () => React.ReactNode) => {
  if (pageHeader && schema?.name?.toLowerCase() === "author") {
    return <b>{defaultFn()}</b>;
  }

  return defaultFn();
};

export function NotionPage({ siteConfig, ...props }: types.PageProps & { siteConfig?: PublicSiteConfig }) {
  if (props.notConfigured) {
    return (
      <div className={styles.container} style={{ position: "static" }}>
        <main className={styles.main}>
          <h1>Site Not Configured</h1>
          <p>Please open the admin console to configure your Notion root page and site settings.</p>
          <p>
            <Link href="/$admin/" className="notion-link">
              Go to /$admin/
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <SiteConfigProvider value={siteConfig}>
      <NotionPageInner {...props} />
    </SiteConfigProvider>
  );
}

function NotionPageInner({ site, recordMap, error, pageId, timestamp }: types.PageProps) {
  const siteConfig = useSiteConfig();
  const components = React.useMemo<Partial<NotionComponents>>(
    () => ({
      nextLegacyImage: Image,
      nextLink: Link,
      Link: NotionLinkMemo,
      PageLink: PageLinkMemo,
      Code,
      Collection,
      Equation,
      Pdf,
      Modal,
      Tweet,
      Header: NotionPageHeader,
      propertyLastEditedTimeValue,
      propertyTextValue,
      propertyDateValue,
    }),
    [],
  );

  const [signedRecordMap, setSignedRecordMap] = useState<types.ExtendedRecordMap>(null);

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {};

    const searchParams = new URLSearchParams(params);
    return mapPageUrl(site, recordMap, searchParams);
  }, [site, recordMap]);

  const keys = Object.keys(recordMap?.block || {});
  const block = getBlockValue(recordMap?.block?.[keys[0]]);

  // const isRootPage =
  //   parsePageId(block?.id) === parsePageId(site?.rootNotionPageId)
  const isBlogPost = block?.type === "page" && block?.parent_table === "collection";

  const showTableOfContents = block?.type === "page";
  const minTableOfContentsItems = 3;

  const pageAside = React.useMemo(
    () => <PageAside block={block} recordMap={recordMap} isBlogPost={isBlogPost} />,
    [block, recordMap, isBlogPost],
  );

  const footer = React.useMemo(() => <Footer />, []);

  useEffect(() => {
    setSignedRecordMap(null);
    if (!recordMap) {
      return;
    }
    const files = getRecordMapUnsignedFiles(recordMap);
    if (files.length == 0) {
      return;
    }
    const controller = new AbortController();
    const signal = controller.signal;
    console.log("signing", files);
    window["_signing_recordMap"] = JSON.stringify(recordMap);
    (async () => {
      try {
        const signedFiles: string[] = await signUrls(files, signal);
        console.log("signedFiles", signedFiles);
        setSignedRecordMap(addSignedUrlsToRecordMap(recordMap, files, signedFiles));
      } catch (e) {
        console.log("sign error", e);
      }
    })();
    return () => {
      controller.abort("useEffect cleanup");
    };
  }, [recordMap]);

  if (error || !site || !block) {
    return <Page404 site={site} pageId={pageId} error={error} />;
  }

  const title = getBlockTitle(block, recordMap) || site.name;
  console.log(
    "notion page",
    new Date(),
    title,
    pageId,
    getCanonicalPageId(pageId, recordMap, {
      rootNotionPageId: site.rootNotionPageId,
      inversePageUrlOverrides: site.inversePageUrlOverrides,
    }),
  );

  if (typeof window !== "undefined") {
    // add important objects to the window global for easy debugging
    const g = window as any;
    g.pageId = pageId;
    g.recordMap = recordMap;
    g.timestamp = timestamp;
    g.block = block;
  }

  // passed as rootPageId to NotionRenderer, used as notion search api request "ancestId" param.
  let searchRootPageId = site.rootNotionPageId;
  const breadcrumbs = getPageBreadcrumbs(recordMap, pageId);
  if (breadcrumbs.length > 0) {
    searchRootPageId = breadcrumbs[0].pageId;
  }

  const disqus = null;
  // const disqus =
  //   config.disqusShortname && pageId !== site.rootNotionPageId ? (
  //     <DiscussionEmbed
  //       shortname={config.disqusShortname}
  //       config={{
  //         url: canonicalPageUrl ? canonicalPageUrl : '',
  //         title: title
  //       }}
  //     />
  //   ) : null

  return (
    <NotionRenderer
      bodyClassName={cs(styles.notion, pageId === site.rootNotionPageId && "index-page")}
      // darkMode={isDarkMode}
      components={components}
      recordMap={signedRecordMap || recordMap}
      rootPageId={searchRootPageId}
      rootDomain={site.domain}
      fullPage={true}
      previewImages={!!recordMap.preview_images}
      showCollectionViewDropdown={false}
      showTableOfContents={showTableOfContents}
      minTableOfContentsItems={minTableOfContentsItems}
      defaultPageIcon={siteConfig.defaultPageIcon}
      defaultPageCover={siteConfig.defaultPageCover}
      defaultPageCoverPosition={siteConfig.defaultPageCoverPosition}
      mapPageUrl={siteMapPageUrl}
      mapImageUrl={mapImageUrl}
      searchNotion={siteConfig.isSearchEnabled ? searchNotion : null}
      pageAside={pageAside}
      pageFooter={disqus}
      footer={footer}
    />
  );
}
