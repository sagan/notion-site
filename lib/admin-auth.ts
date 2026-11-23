import "server-only";
import { NextRequest } from "next/server";
import { compareToken } from "./token";

export const ADMIN_COOKIE_NAME = "admin_token";

export function isValidAdminToken(token: string | null | undefined): boolean {
  const expected = process.env.TOKEN || "";
  if (!expected || !token) {
    return false;
  }
  return compareToken(token, expected);
}

export function isAdminRequestAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const headerToken = req.headers.get("x-admin-token") || "";
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";

  return isValidAdminToken(bearer) || isValidAdminToken(headerToken) || isValidAdminToken(cookieToken);
}
