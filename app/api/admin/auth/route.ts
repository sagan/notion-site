import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isAdminRequestAuthorized, isValidAdminToken } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const hasServerToken = Boolean(process.env.TOKEN);
  return NextResponse.json({
    authenticated: isAdminRequestAuthorized(req),
    tokenConfigured: hasServerToken,
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.TOKEN) {
    return NextResponse.json({ error: "Server TOKEN environment variable is not configured" }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!isValidAdminToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
