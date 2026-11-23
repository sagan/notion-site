import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { favicons } from "favicons";
import { getRuntimeConfig, SITE_CONFIG_CACHE_TAG } from "./runtime-config";

export type FaviconName = "favicon.ico" | "favicon.png" | "favicon-192x192.png";

const FAVICON_FILE_MAP: Record<string, FaviconName> = {
  "favicon.ico": "favicon.ico",
  "favicon-32x32.png": "favicon.png",
  "android-chrome-192x192.png": "favicon-192x192.png",
};

const DEFAULT_FAVICON_PATH = path.join(process.cwd(), "assets/favicon.png");

async function loadSourceBuffer(faviconUrl: string | null): Promise<Buffer> {
  if (faviconUrl) {
    try {
      if (faviconUrl.startsWith("http://") || faviconUrl.startsWith("https://")) {
        const res = await fetch(faviconUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return Buffer.from(await res.arrayBuffer());
      }
      if (faviconUrl.startsWith("data:")) {
        const commaIdx = faviconUrl.indexOf(",");
        if (commaIdx !== -1) {
          const meta = faviconUrl.slice(0, commaIdx);
          const data = faviconUrl.slice(commaIdx + 1);
          return Buffer.from(data, meta.includes(";base64") ? "base64" : "utf8");
        }
      }
      const localPath = path.isAbsolute(faviconUrl) ? faviconUrl : path.join(process.cwd(), faviconUrl);
      return await fs.readFile(localPath);
    } catch (err) {
      console.warn(`Failed to load faviconUrl "${faviconUrl}", falling back to default:`, err);
    }
  }
  return fs.readFile(DEFAULT_FAVICON_PATH);
}

async function generateFaviconMap(faviconUrl: string | null): Promise<Record<FaviconName, string>> {
  let source: Buffer;
  try {
    source = await loadSourceBuffer(faviconUrl);
  } catch {
    source = await fs.readFile(DEFAULT_FAVICON_PATH);
  }

  let response: Awaited<ReturnType<typeof favicons>>;
  try {
    response = await favicons(source, {
      icons: {
        android: true,
        appleIcon: false,
        appleStartup: false,
        favicons: true,
        windows: false,
        yandex: false,
      },
    });
  } catch (err) {
    console.warn("favicons generation failed for custom source, using default:", err);
    const fallbackSource = await fs.readFile(DEFAULT_FAVICON_PATH);
    response = await favicons(fallbackSource, {
      icons: {
        android: true,
        appleIcon: false,
        appleStartup: false,
        favicons: true,
        windows: false,
        yandex: false,
      },
    });
  }

  const result = {} as Record<FaviconName, string>;
  for (const file of response.images) {
    const mappedName = FAVICON_FILE_MAP[file.name];
    if (mappedName) {
      result[mappedName] = Buffer.from(file.contents).toString("base64");
    }
  }
  return result;
}

const getCachedFaviconMap = unstable_cache(
  async (faviconUrl: string) => generateFaviconMap(faviconUrl || null),
  ["runtime-favicons"],
  { tags: [SITE_CONFIG_CACHE_TAG, "favicon"] },
);

export async function getFaviconResponse(name: FaviconName, contentType: string): Promise<Response> {
  const cfg = await getRuntimeConfig();
  const map = await getCachedFaviconMap(cfg.faviconUrl || "");
  const b64 = map[name];
  if (!b64) {
    return new Response("Not Found", { status: 404 });
  }
  const buf = Buffer.from(b64, "base64");
  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
    },
  });
}
