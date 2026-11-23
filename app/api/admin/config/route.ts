import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-auth";
import { getRawStoredSiteConfig, getRuntimeConfigUncached, saveRuntimeConfig } from "@/lib/runtime-config";

export async function GET(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [stored, resolved] = await Promise.all([getRawStoredSiteConfig(), getRuntimeConfigUncached()]);
  return NextResponse.json({ stored, resolved });
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const resolved = await saveRuntimeConfig(body);
    const stored = await getRawStoredSiteConfig();
    return NextResponse.json({ ok: true, stored, resolved });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save config" }, { status: 400 });
  }
}
