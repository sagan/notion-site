/**
 * This function get executed in the beginning of client page init (after <body>), before the main client JS codes.
 * It must be standalone, do not depend on other modules,
 * that's say, only standard JavaScript runtime functions can be used here.
 * Use body dataset to set client side only props.
 * Do not use body class list, as nextjs 18+ render <body> from server,
 * differences between server and client will result in hydration error.
 */
export function pageInit() {
  // original body class: dark-mode / light-mode
  const storageKey = "darkMode";
  const preferDarkQuery = "(prefers-color-scheme: dark)";
  const mql = window.matchMedia(preferDarkQuery);
  const supportsColorSchemeQuery = mql.media === preferDarkQuery;
  let localStorageIsDark: boolean = null;
  try {
    const localStorageTheme = localStorage.getItem(storageKey);
    if (localStorageTheme) {
      localStorageIsDark = JSON.parse(localStorageTheme);
    }
  } catch (err) {}
  // Determine the source of truth
  if (localStorageIsDark !== null) {
    // source of truth from localStorage
    document.body.dataset.dark = localStorageIsDark ? "1" : "0";
  } else if (supportsColorSchemeQuery) {
    // source of truth from system
    document.body.dataset.dark = mql.matches ? "1" : "0";
  } else {
    document.body.dataset.dark = "0";
  }
}
