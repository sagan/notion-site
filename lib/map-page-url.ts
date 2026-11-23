import { ExtendedRecordMap } from "notion-types";
import { parsePageId, uuidToId } from "notion-utils";

import { getCanonicalPageId } from "./get-canonical-page-id";
import { Site } from "./types";
import { escapePageId } from "./util";

export const mapPageUrl =
  (site: Site, recordMap: ExtendedRecordMap, searchParams: URLSearchParams) =>
  (pageId = "") => {
    const pageUuid = parsePageId(pageId);

    if (uuidToId(pageUuid) === site.rootNotionPageId) {
      return createUrl("/", searchParams);
    } else {
      return createUrl(
        `/${escapePageId(
          getCanonicalPageId(pageUuid, recordMap, {
            rootNotionPageId: site.rootNotionPageId,
            inversePageUrlOverrides: site.inversePageUrlOverrides,
          }),
        )}`,
        searchParams,
      );
    }
  };

export const getCanonicalPageUrl =
  (site: Site, recordMap: ExtendedRecordMap) =>
  (pageId = "") => {
    const pageUuid = parsePageId(pageId);

    if (uuidToId(pageId) === site.rootNotionPageId) {
      return `https://${site.domain}`;
    } else {
      return `https://${site.domain}/${escapePageId(
        getCanonicalPageId(pageUuid, recordMap, {
          rootNotionPageId: site.rootNotionPageId,
          inversePageUrlOverrides: site.inversePageUrlOverrides,
        }),
      )}`;
    }
  };

function createUrl(path: string, searchParams: URLSearchParams) {
  return [path, searchParams.toString()].filter(Boolean).join("?");
}
