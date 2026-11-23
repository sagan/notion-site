import { NextRequest, NextResponse } from "next/server";
import { notion } from "../../../lib/notion-api";
import * as types from "../../../lib/types";

interface SignParams {
  files: types.SignedUrlRequest[]; // unsigned files
}

export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  const payload: SignParams = await req.json();
  console.log("<<< lambda sign", payload);
  const { signedUrls } = await notion.getSignedFileUrls(payload.files);
  if (signedUrls.length != payload.files.length) {
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
  return NextResponse.json(signedUrls, {
    headers: {
      "Cache-Control": "public, s-maxage=60, max-age=60, stale-while-revalidate=60",
    },
  });
}
