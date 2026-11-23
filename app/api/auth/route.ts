import { NextRequest, NextResponse } from "next/server";
import { parseRequestParams } from "@/lib/parse-request-params";
import { compareToken } from "@/lib/token";

export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = await parseRequestParams(req);
  return doWork(params);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const params = await parseRequestParams(req);
  return doWork(params);
}

async function doWork(params: URLSearchParams): Promise<NextResponse> {
  const TOKEN = process.env.TOKEN || "";
  const token = params.get("token") || "";
  if (!TOKEN || !compareToken(token, TOKEN)) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  return NextResponse.json({});
}
