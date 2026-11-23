import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/runtime-config";
import baseManifest from "../../assets/manifest.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getRuntimeConfig();
  const manifest = {
    ...baseManifest,
    name: cfg.name || "Notion Site",
    short_name: cfg.shortName || cfg.name || "Notion Site",
  };
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
