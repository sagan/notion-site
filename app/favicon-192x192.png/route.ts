import { getFaviconResponse } from "@/lib/favicons";

export const dynamic = "force-dynamic";

export async function GET() {
  return getFaviconResponse("favicon-192x192.png", "image/png");
}
