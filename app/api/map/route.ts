import { NextRequest, NextResponse } from "next/server";
import { parsePageId } from "notion-utils";
import { getSiteMap } from "@/lib/site-map";

export const maxDuration = 60;

// https://nextjs.org/docs/app/api-reference/file-conventions/route
// request: a NextRequest object, which is an extension of the Web Request
// params: a promise that resolves to an object containing the dynamic route parameters for the current route.
export async function GET(req: NextRequest): Promise<NextResponse> {
  // const team = (await params).team
  // const url = request.nextUrl
  const siteMap = await getSiteMap();

  const url = new URL(req.url);
  if (url.searchParams.has("id")) {
    const id = parsePageId(url.searchParams.get("id"));
    return NextResponse.json(siteMap.pageMap[id]);
  }
  return NextResponse.json(siteMap.canonicalPageMap);
}
