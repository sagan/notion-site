import { getPageContentBlockIds, getBlockValue } from "notion-utils";
import * as types from "./types";

export function isUnsignedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return !!urlObj.pathname.match(/\/[-a-z0-9]{36}\/[-a-z0-9]{36}\/[^\/]+$/) && !urlObj.searchParams.get("signature");
  } catch (e) {}
  return false;
}

export function getRecordMapUnsignedFiles(recordMap: types.ExtendedRecordMap): types.SignedUrlRequest[] {
  const contentBlockIds = getPageContentBlockIds(recordMap);

  // 2023-11: for now, it seems public page images can be accessed without signing.
  const allFileInstances = contentBlockIds.flatMap((blockId) => {
    const block = getBlockValue(recordMap.block[blockId]);
    if (
      block &&
      (block.type === "pdf" ||
        block.type === "audio" ||
        (block.type === "image" && block.file_ids?.length) ||
        block.type === "video" ||
        block.type === "file" ||
        block.type === "page")
    ) {
      const source = block.type === "page" ? block.format?.page_cover : block.properties?.source?.[0]?.[0];
      // console.log(block, source)

      if (source) {
        if (
          !source.startsWith("attachment:") &&
          !source.includes("secure.notion-static.com") &&
          (block.type == "image" || !isUnsignedUrl(source))
        ) {
          return [];
        }

        return {
          permissionRecord: {
            table: "block",
            id: block.id,
          },
          url: source,
        };
      }
    }

    return [];
  });
  return allFileInstances;
}

export function addSignedUrlsToRecordMap(
  recordMap: types.ExtendedRecordMap,
  requests: types.SignedUrlRequest[],
  signedUrls: string[],
): types.ExtendedRecordMap {
  recordMap = { ...recordMap };
  for (const [i, file] of requests.entries()) {
    const signedUrl = signedUrls[i];
    if (!signedUrl) continue;

    const blockId = file.permissionRecord.id;
    if (!blockId) continue;

    recordMap.signed_urls[blockId] = signedUrl;
  }
  return recordMap;
}

export async function signUrls(files: types.SignedUrlRequest[], signal?: AbortSignal): Promise<string[]> {
  const res = await fetch("/api/sign", {
    signal: signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files }),
  });
  if (res.status != 200) {
    throw new Error(`status=${res.status}`);
  }
  const signedFiles: string[] = await res.json();
  return signedFiles;
}
