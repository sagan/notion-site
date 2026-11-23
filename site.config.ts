import { SiteConfig, siteConfig } from "./lib/site-config";

const config: SiteConfig = {
  // the site's root Notion page (required)
  rootNotionPageId: "",

  extraRootNotionPageIds: [],

  // if you want to restrict pages to a single notion workspace (optional)
  // (this should be a Notion ID; see the docs for how to extract this)
  rootNotionSpaceId: null,

  // basic site info (required)
  name: "",
  shortName: "",
  domain: "localhost",
  author: "me",

  // open graph metadata (optional)
  description: "",

  // social usernames (optional)
  twitter: "",
  github: "",
  linkedin: "",
  // mastodon: '#', // optional mastodon profile URL, provides link verification
  // newsletter: '#', // optional newsletter URL
  // youtube: '#', // optional youtube channel name or `channel/UCGbXXXXXXXXXXXXXXXXXXXXXX`

  // default notion icon and cover images for site-wide consistency (optional)
  // page-specific values will override these site-wide defaults
  defaultPageIcon: null,
  defaultPageCover: null,
  defaultPageCoverPosition: 0.5,
  faviconUrl: null,

  // To enable Google Analytics, include your Data Stream Measurement ID here
  // googleAnalyticsId: '',
  // To enable Disqsus Comments, include your Disqus Shortname here
  // disqusShortname: '',
  // To enable a Privacy Policy link in the footer, include your Page ID here
  // privacyPolicy: '',

  // whether or not to enable support for LQIP preview images (optional)
  isPreviewImageSupportEnabled: true,

  // whether or not redis is enabled for caching generated preview images (optional)
  // NOTE: if you enable redis, you need to set the `REDIS_HOST` and `REDIS_PASSWORD`
  // environment variables. see the readme for more info
  isRedisEnabled: false,

  showPageSocial: false, // show social icons in page side bar

  // map of notion page IDs to URL paths (optional)
  // any pages defined here will override their default URL paths
  // example:
  //
  // pageUrlOverrides: {
  //   '/foo': '067dd719a912471ea9a3ac10710e7fdf',
  //   '/bar': '0be6efce9daf42688f65c76b89f8eb27'
  // }
  pageUrlOverrides: null,

  // whether to use the default notion navigation style or a custom one with links to
  // important pages. To use `navigationLinks`, set `navigationStyle` to `custom`.
  navigationStyle: "custom", // default | custom
  navigationLinks: [
    {
      title: "Home",
      url: "/",
    },
  ],
};

export default siteConfig(config);
