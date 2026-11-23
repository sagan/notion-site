import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";
import { getSiteMap } from "@/lib/site-map";

export async function GET(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const siteMap = await getSiteMap();
  return NextResponse.json({
    canonicalPageMap: siteMap.canonicalPageMap || {},
  });
}
