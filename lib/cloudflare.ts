import { getRuntimeConfig } from "@/lib/runtime-config";

const CF_PURGE_BATCH_SIZE = 30;

export interface CloudflarePurgeResult {
  purged: boolean;
  skipped?: boolean;
  purgeEverything?: boolean;
  urls?: string[];
  error?: string;
}

function buildOrigins(domain: string): string[] {
  if (!domain || domain === "localhost") {
    return [];
  }
  const origins = [`https://${domain}`];
  if (!domain.startsWith("www.")) {
    origins.push(`https://www.${domain}`);
  }
  return origins;
}

async function callPurgeApi(
  zoneId: string,
  token: string,
  body: { purge_everything: true } | { files: string[] },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    const msg = data?.errors?.map((e: any) => e.message).join("; ") || `HTTP ${res.status}`;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

/**
 * Purge Cloudflare edge cache for the given relative paths or the entire zone.
 * No-ops when CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID is not configured.
 */
export async function purgeCloudflareCache(options: {
  all?: boolean;
  paths?: string[];
}): Promise<CloudflarePurgeResult> {
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  const zoneId = process.env.CLOUDFLARE_ZONE_ID || "";
  if (!token || !zoneId) {
    return { purged: false, skipped: true };
  }

  try {
    if (options.all) {
      const result = await callPurgeApi(zoneId, token, { purge_everything: true });
      return result.ok
        ? { purged: true, purgeEverything: true }
        : { purged: false, purgeEverything: true, error: result.error };
    }

    const cfg = await getRuntimeConfig();
    const origins = buildOrigins(cfg.domain);
    if (origins.length === 0) {
      return { purged: false, skipped: true };
    }

    const urlSet = new Set<string>();
    for (const rawPath of options.paths || []) {
      if (!rawPath) continue;
      const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
      for (const origin of origins) {
        urlSet.add(`${origin}${normalized}`);
      }
    }

    const urls = Array.from(urlSet);
    if (urls.length === 0) {
      return { purged: false, skipped: true };
    }

    for (let i = 0; i < urls.length; i += CF_PURGE_BATCH_SIZE) {
      const batch = urls.slice(i, i + CF_PURGE_BATCH_SIZE);
      const result = await callPurgeApi(zoneId, token, { files: batch });
      if (!result.ok) {
        return { purged: false, urls, error: result.error };
      }
    }

    return { purged: true, urls };
  } catch (err: any) {
    return { purged: false, error: err?.message || String(err) };
  }
}
