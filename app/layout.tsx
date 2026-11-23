import type { Metadata, Viewport } from "next";
import React from "react";
// Not compatible with nextjs v13+ server component.
// https://github.com/react-icons/react-icons/issues/770
// <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}></IconContext>
//import { IconContext } from '@react-icons/all-files'
// used for rendering equations (optional)
import "katex/dist/katex.min.css";
// used for code syntax highlighting (optional)
import "prismjs/themes/prism-coy.css";
import ReactGA from "react-ga4";
// core styles shared by all of react-notion-x (required)
import "react-notion-x/src/styles.css";
import "@/styles/dark-mode.css";
import "@/styles/global.css";
// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'
// global style overrides for notion
import "@/styles/notion.css";
// global style overrides for prism theme (optional)
import "@/styles/prism-theme.css";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { pageInit } from "@/lib/page-init";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefffe" },
    { media: "(prefers-color-scheme: dark)", color: "#2d3439" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getRuntimeConfig();
  return {
    icons: {
      shortcut: "/favicon.ico",
      icon: {
        url: "/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
    },
    manifest: "/manifest.json",
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      siteName: cfg.name,
      type: "website",
    },
    appleWebApp: {
      statusBarStyle: "black",
    },
    twitter: cfg.twitter ? { creator: cfg.twitter } : {},
    alternates: {
      types: {
        "application/rss+xml": [
          {
            url: `${cfg.host}/feed`,
            title: cfg.name,
          },
        ],
      },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getRuntimeConfig();
  if (cfg.googleAnalyticsId) {
    ReactGA.initialize(cfg.googleAnalyticsId);
    ReactGA.send("pageview");
  }

  // https://github.com/vercel/next.js/issues/44343
  // nextjs v13+ (react 18) hydration from <html> instead of a __next div
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  var pageInit = ${pageInit.toString()};
  try {
    pageInit();
  } catch(e) {}
})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
