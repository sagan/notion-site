import { getBlockValue } from "notion-utils";
import * as types from "./types";

export function getPageSpaceId(page: types.Page): string {
  return getBlockValue(page?.recordMap?.block[page.pageId])?.space_id || "";
}
