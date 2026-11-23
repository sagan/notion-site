import React from "react";
import * as types from "notion-types";
import cs from "classnames";
import { Breadcrumbs, Header, Search, useNotionContext } from "react-notion-x";
import { IconType } from "@react-icons/all-files/lib";
import { IoHome } from "@react-icons/all-files/io5/IoHome";
import { IoMdContact } from "@react-icons/all-files/io/IoMdContact";
import { FaSitemap } from "@react-icons/all-files/fa/FaSitemap";
import { useSiteConfig } from "./SiteConfigContext";
import styles from "./styles.module.css";

const iconComponents: { [key: string]: IconType } = {
  contact: IoMdContact,
  home: IoHome,
  map: FaSitemap,
  sitemap: FaSitemap,
};

export function NotionPageHeader({ block }: { block: types.CollectionViewPageBlock | types.PageBlock }) {
  const { components, mapPageUrl } = useNotionContext();
  const { isSearchEnabled, navigationLinks, navigationStyle } = useSiteConfig();

  if (navigationStyle === "default") {
    return <Header block={block} />;
  }

  return (
    <header className="notion-header">
      <div className="notion-nav-header">
        <Breadcrumbs block={block} rootOnly={false} />

        <div className="notion-nav-header-rhs breadcrumbs">
          {navigationLinks
            ?.map((link, index) => {
              if (!link.pageId && !link.url) {
                return null;
              }

              if (link.pageId || link.url.startsWith("/")) {
                const url = link.pageId ? mapPageUrl(link.pageId) : link.url;
                const Component = iconComponents[link.title?.toLowerCase()];
                return (
                  <components.PageLink href={url} key={index} className={cs(styles.navLink, "breadcrumb", "button")}>
                    {Component ? <Component title={link.title} /> : link.title}
                  </components.PageLink>
                );
              } else {
                return (
                  <components.Link href={link.url} key={index} className={cs(styles.navLink, "breadcrumb", "button")}>
                    {link.title}
                  </components.Link>
                );
              }
            })
            .filter(Boolean)}
          {isSearchEnabled && <Search block={block} title={null} />}
        </div>
      </div>
    </header>
  );
}
