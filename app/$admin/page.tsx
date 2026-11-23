"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./admin.module.css";

type Tab = "config" | "jobs" | "cache" | "pages";

const VALID_TABS: Tab[] = ["config", "jobs", "cache", "pages"];

function parseTab(value: string | null): Tab {
  if (value && VALID_TABS.includes(value as Tab)) {
    return value as Tab;
  }
  return "config";
}

interface JobSummary {
  status: "idle" | "running" | "paused" | "completed" | "error";
  startedAt: number | null;
  updatedAt: number | null;
  completedAt: number | null;
  queueLength?: number;
  visitedCount?: number;
  indexedCount?: number;
  processedCount?: number;
  errorCount?: number;
  remainingCount?: number;
  completedCount?: number;
  totalCount?: number;
  failedCount?: number;
  failedItems?: Array<{ slug: string; pageId: string; error: string }>;
  lastError?: string;
  logs: string[];
}

interface ConfigFormState {
  rootNotionPageId: string;
  extraRootNotionPageIds: string;
  rootNotionSpaceId: string;
  name: string;
  shortName: string;
  domain: string;
  author: string;
  description: string;
  language: string;
  twitter: string;
  github: string;
  linkedin: string;
  youtube: string;
  zhihu: string;
  mastodon: string;
  newsletter: string;
  googleAnalyticsId: string;
  defaultPageCover: string;
  defaultPageIcon: string;
  faviconUrl: string;
  navigationStyle: "default" | "custom";
  navigationLinksJson: string;
  pageUrlOverridesJson: string;
  isPreviewImageSupportEnabled: boolean;
  isSearchEnabled: boolean;
  showPageSocial: boolean;
}

const emptyForm: ConfigFormState = {
  rootNotionPageId: "",
  extraRootNotionPageIds: "",
  rootNotionSpaceId: "",
  name: "",
  shortName: "",
  domain: "localhost",
  author: "me",
  description: "",
  language: "en",
  twitter: "",
  github: "",
  linkedin: "",
  youtube: "",
  zhihu: "",
  mastodon: "",
  newsletter: "",
  googleAnalyticsId: "",
  defaultPageCover: "",
  defaultPageIcon: "",
  faviconUrl: "",
  navigationStyle: "custom",
  navigationLinksJson: '[{"title":"Home","url":"/"}]',
  pageUrlOverridesJson: "{}",
  isPreviewImageSupportEnabled: true,
  isSearchEnabled: true,
  showPageSocial: false,
};

function normalizePageUrlOverrides(overrides: unknown): Record<string, string> {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(overrides).map(([k, v]) => [k.startsWith("/") ? k : `/${k}`, String(v ?? "")]),
  );
}

function configToFormState(c: Record<string, unknown>): ConfigFormState {
  const str = (key: string, fallback = "") => {
    const val = c[key];
    return typeof val === "string" ? val : fallback;
  };

  return {
    rootNotionPageId: str("rootNotionPageId"),
    extraRootNotionPageIds: Array.isArray(c.extraRootNotionPageIds)
      ? c.extraRootNotionPageIds.map((id) => String(id)).join(", ")
      : str("extraRootNotionPageIds"),
    rootNotionSpaceId: str("rootNotionSpaceId"),
    name: str("name"),
    shortName: str("shortName"),
    domain: str("domain") || "localhost",
    author: str("author"),
    description: str("description"),
    language: str("language") || "en",
    twitter: str("twitter"),
    github: str("github"),
    linkedin: str("linkedin"),
    youtube: str("youtube"),
    zhihu: str("zhihu"),
    mastodon: str("mastodon"),
    newsletter: str("newsletter"),
    googleAnalyticsId: str("googleAnalyticsId"),
    defaultPageCover: str("defaultPageCover"),
    defaultPageIcon: str("defaultPageIcon"),
    faviconUrl: str("faviconUrl"),
    navigationStyle: c.navigationStyle === "default" ? "default" : "custom",
    navigationLinksJson: JSON.stringify(Array.isArray(c.navigationLinks) ? c.navigationLinks : [], null, 2),
    pageUrlOverridesJson: JSON.stringify(normalizePageUrlOverrides(c.pageUrlOverrides), null, 2),
    isPreviewImageSupportEnabled:
      c.isPreviewImageSupportEnabled !== undefined
        ? Boolean(c.isPreviewImageSupportEnabled)
        : emptyForm.isPreviewImageSupportEnabled,
    isSearchEnabled: c.isSearchEnabled !== undefined ? Boolean(c.isSearchEnabled) : emptyForm.isSearchEnabled,
    showPageSocial: c.showPageSocial !== undefined ? Boolean(c.showPageSocial) : emptyForm.showPageSocial,
  };
}

function buildConfigPayload(form: ConfigFormState) {
  const navigationLinks = JSON.parse(form.navigationLinksJson || "[]");
  if (!Array.isArray(navigationLinks)) {
    throw new Error("Navigation Links must be a JSON array.");
  }

  const pageUrlOverrides = JSON.parse(form.pageUrlOverridesJson || "{}");
  if (!pageUrlOverrides || typeof pageUrlOverrides !== "object" || Array.isArray(pageUrlOverrides)) {
    throw new Error("Page URL Overrides must be a JSON object.");
  }

  const extraRootNotionPageIds = form.extraRootNotionPageIds
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    rootNotionPageId: form.rootNotionPageId.trim(),
    extraRootNotionPageIds,
    rootNotionSpaceId: form.rootNotionSpaceId.trim() || null,
    name: form.name.trim(),
    shortName: form.shortName.trim(),
    domain: form.domain.trim() || "localhost",
    author: form.author.trim(),
    description: form.description.trim(),
    language: form.language.trim() || "en",
    twitter: form.twitter.trim() || null,
    github: form.github.trim() || null,
    linkedin: form.linkedin.trim() || null,
    youtube: form.youtube.trim() || null,
    zhihu: form.zhihu.trim() || null,
    mastodon: form.mastodon.trim() || null,
    newsletter: form.newsletter.trim() || null,
    googleAnalyticsId: form.googleAnalyticsId.trim() || null,
    defaultPageCover: form.defaultPageCover.trim() || null,
    defaultPageIcon: form.defaultPageIcon.trim() || null,
    faviconUrl: form.faviconUrl.trim() || null,
    navigationStyle: form.navigationStyle,
    navigationLinks,
    pageUrlOverrides,
    isPreviewImageSupportEnabled: form.isPreviewImageSupportEnabled,
    isSearchEnabled: form.isSearchEnabled,
    showPageSocial: form.showPageSocial,
  };
}

function AdminPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTab = parseTab(searchParams.get("tab"));
  const urlTarget = searchParams.get("target") ?? searchParams.get("slug") ?? "";

  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [tokenConfigured, setTokenConfigured] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [tab, setTab] = useState<Tab>(urlTab);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const [form, setForm] = useState<ConfigFormState>(emptyForm);
  const [savingConfig, setSavingConfig] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const [indexJob, setIndexJob] = useState<JobSummary | null>(null);
  const [precacheJob, setPrecacheJob] = useState<JobSummary | null>(null);
  const [sitemapCount, setSitemapCount] = useState(0);
  const [runningJobType, setRunningJobType] = useState<"index" | "precache" | null>(null);
  const [forceFreshJob, setForceFreshJob] = useState(false);
  const [warmRoutes, setWarmRoutes] = useState(true);
  const stopLoopRef = useRef(false);

  const [sitemapEntries, setSitemapEntries] = useState<Array<[string, string]>>([]);
  const [pageFilter, setPageFilter] = useState("");
  const [clearCacheTarget, setClearCacheTarget] = useState(urlTarget);
  const [clearingCache, setClearingCache] = useState(false);
  const [refreshingPage, setRefreshingPage] = useState(false);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (urlTarget) {
      setClearCacheTarget(urlTarget);
    }
  }, [urlTarget]);

  const selectTab = useCallback(
    (nextTab: Tab) => {
      setTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "config") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      if (nextTab !== "cache") {
        params.delete("target");
        params.delete("slug");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth");
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      setTokenConfigured(Boolean(data.tokenConfigured));
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/config");
    if (!res.ok) return;
    const data = await res.json();
    setForm(configToFormState((data.resolved || {}) as Record<string, unknown>));
  }, []);

  const loadJobs = useCallback(async () => {
    const res = await fetch("/api/admin/jobs");
    if (!res.ok) return;
    const data = await res.json();
    setIndexJob(data.indexJob);
    setPrecacheJob(data.precacheJob);
    setSitemapCount(data.sitemapCount || 0);
  }, []);

  const loadSitemap = useCallback(async () => {
    const res = await fetch("/api/admin/sitemap");
    if (!res.ok) return;
    const data = await res.json();
    const entries = Object.entries(data.canonicalPageMap || {}) as Array<[string, string]>;
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    setSitemapEntries(entries);
  }, []);

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (authenticated) {
      loadConfig();
      loadJobs();
      loadSitemap();
    }
  }, [authenticated, loadConfig, loadJobs, loadSitemap]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenInput }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAuthError(data.error || "Login failed");
      return;
    }
    setTokenInput("");
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setNotice(null);
    try {
      const payload = buildConfigPayload(form);

      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }
      setNotice({ text: "Configuration saved to Redis and cache revalidated." });
    } catch (err: any) {
      setNotice({ text: err?.message || String(err), error: true });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExportConfig = () => {
    setNotice(null);
    try {
      const payload = buildConfigPayload(form);
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeDomain = (payload.domain || "site").replace(/[^a-zA-Z0-9.-]/g, "_");
      a.href = url;
      a.download = `site-config-${safeDomain}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice({ text: "Configuration exported as JSON." });
    } catch (err: any) {
      setNotice({ text: err?.message || String(err), error: true });
    }
  };

  const handleImportConfigFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setNotice(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid config JSON: expected a JSON object.");
      }
      if (parsed.navigationLinks !== undefined && !Array.isArray(parsed.navigationLinks)) {
        throw new Error('Invalid config JSON: "navigationLinks" must be an array.');
      }
      if (
        parsed.pageUrlOverrides !== undefined &&
        (!parsed.pageUrlOverrides ||
          typeof parsed.pageUrlOverrides !== "object" ||
          Array.isArray(parsed.pageUrlOverrides))
      ) {
        throw new Error('Invalid config JSON: "pageUrlOverrides" must be an object.');
      }

      setForm(configToFormState(parsed as Record<string, unknown>));
      setNotice({
        text: `Imported configuration from "${file.name}". Click "Save Configuration" to apply.`,
      });
    } catch (err: any) {
      setNotice({
        text: `Failed to import config: ${err?.message || String(err)}`,
        error: true,
      });
    }
  };

  const runJobLoop = async (type: "index" | "precache", action: "run" | "restart" | "reset") => {
    setNotice(null);
    if (action === "reset") {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action: "reset" }),
      });
      const data = await res.json();
      if (type === "index") setIndexJob(data.indexJob);
      else setPrecacheJob(data.precacheJob);
      return;
    }

    stopLoopRef.current = false;
    setRunningJobType(type);
    let currentAction: "run" | "restart" = action;
    try {
      while (!stopLoopRef.current) {
        const res = await fetch("/api/admin/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            action: currentAction,
            forceFresh: forceFreshJob,
            warmRoutes,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const job: JobSummary = type === "index" ? data.indexJob : data.precacheJob;
        if (type === "index") {
          setIndexJob(job);
          if (job.indexedCount !== undefined) {
            setSitemapCount(job.indexedCount);
          }
        } else {
          setPrecacheJob(job);
        }

        // Subsequent iterations always resume ('run') from checkpoint
        currentAction = "run";
        if (job.status !== "paused") {
          break;
        }
      }
      if (type === "index") {
        await loadSitemap();
      }
    } catch (err: any) {
      setNotice({ text: err?.message || String(err), error: true });
      await loadJobs();
    } finally {
      setRunningJobType(null);
    }
  };

  const handleClearCache = async (target: string) => {
    setNotice(null);
    setClearingCache(true);
    try {
      const res = await fetch("/api/admin/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Clear cache failed");
      }
      const cfMsg = data.cloudflare?.purged
        ? " + Cloudflare cache purged"
        : data.cloudflare?.error
          ? ` (Cloudflare purge error: ${data.cloudflare.error})`
          : "";
      setNotice({
        text: `Cleared unstable_cache for tag "${data.tag}"${cfMsg}.`,
      });
    } catch (err: any) {
      setNotice({ text: err?.message || String(err), error: true });
    } finally {
      setClearingCache(false);
    }
  };

  const handleRefreshSinglePage = async (rawTarget: string) => {
    setNotice(null);
    setRefreshingPage(true);
    try {
      let path = rawTarget.trim();
      if (path.startsWith("http://") || path.startsWith("https://")) {
        try {
          path = new URL(path).pathname;
        } catch {}
      }
      try {
        path = decodeURIComponent(path);
      } catch {}
      const slug = path.replace(/^\/+|\/+$/g, "");
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ text: data.error || "Refresh failed", error: true });
        return;
      }
      setNotice({ text: `Refreshed /${slug}` });
    } catch (err: any) {
      setNotice({ text: err?.message || String(err), error: true });
    } finally {
      setRefreshingPage(false);
    }
  };

  if (!authChecked) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={styles.wrapper}>
        <div className={`${styles.card} ${styles.loginBox}`}>
          <h1 className={styles.title} style={{ marginBottom: 12 }}>
            Admin Login
          </h1>
          {!tokenConfigured && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              Server <code>TOKEN</code> environment variable is not set.
            </div>
          )}
          {authError && <div className={`${styles.alert} ${styles.alertError}`}>{authError}</div>}
          <form onSubmit={handleLogin}>
            <div className={styles.field}>
              <label className={styles.label}>Admin Token</label>
              <input
                type="password"
                className={styles.input}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter TOKEN"
                autoFocus
              />
            </div>
            <div className={styles.btnRow}>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                Log In
              </button>
              <Link href="/" className={styles.btn}>
                Back to Site
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const filteredPages = sitemapEntries.filter(([slug, id]) => {
    if (!pageFilter.trim()) return true;
    const q = pageFilter.toLowerCase();
    return slug.toLowerCase().includes(q) || id.toLowerCase().includes(q);
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Notion Site Admin</h1>
          <div className={styles.headerActions}>
            <Link href="/" className={styles.btn}>
              View Site
            </Link>
            <button onClick={handleLogout} className={styles.btn}>
              Log Out
            </button>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "config" ? styles.tabActive : ""}`}
            onClick={() => selectTab("config")}
          >
            Site & Notion Config
          </button>
          <button
            className={`${styles.tab} ${tab === "jobs" ? styles.tabActive : ""}`}
            onClick={() => selectTab("jobs")}
          >
            Index & Pre-cache Jobs
          </button>
          <button
            className={`${styles.tab} ${tab === "cache" ? styles.tabActive : ""}`}
            onClick={() => selectTab("cache")}
          >
            Cache Management
          </button>
          <button
            className={`${styles.tab} ${tab === "pages" ? styles.tabActive : ""}`}
            onClick={() => selectTab("pages")}
          >
            Indexed Pages ({sitemapEntries.length})
          </button>
        </div>

        {notice && <div className={`${styles.alert} ${notice.error ? styles.alertError : ""}`}>{notice.text}</div>}

        {tab === "config" && (
          <form onSubmit={handleSaveConfig} className={styles.card}>
            <h2 className={styles.cardTitle}>Notion Backend</h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>Root Notion Page ID *</label>
                <input
                  className={styles.input}
                  value={form.rootNotionPageId}
                  onChange={(e) => setForm({ ...form, rootNotionPageId: e.target.value })}
                  placeholder="32-char hex ID or Notion URL"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Root Notion Space ID (optional)</label>
                <input
                  className={styles.input}
                  value={form.rootNotionSpaceId}
                  onChange={(e) => setForm({ ...form, rootNotionSpaceId: e.target.value })}
                  placeholder="Restrict pages to single workspace"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Extra Root Notion Page IDs (comma or newline separated)</label>
              <input
                className={styles.input}
                value={form.extraRootNotionPageIds}
                onChange={(e) => setForm({ ...form, extraRootNotionPageIds: e.target.value })}
              />
            </div>

            <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>
              Site Metadata
            </h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>Site Name</label>
                <input
                  className={styles.input}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Short Name</label>
                <input
                  className={styles.input}
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Domain</label>
                <input
                  className={styles.input}
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Author</label>
                <input
                  className={styles.input}
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Language</label>
                <input
                  className={styles.input}
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Google Analytics ID</label>
                <input
                  className={styles.input}
                  value={form.googleAnalyticsId}
                  onChange={(e) => setForm({ ...form, googleAnalyticsId: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Favicon URL (optional)</label>
                <input
                  className={styles.input}
                  value={form.faviconUrl}
                  onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                  placeholder="https://... or leave empty for default"
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <input
                className={styles.input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>
              Navigation & URL Overrides
            </h2>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>Navigation Style</label>
                <select
                  className={styles.select}
                  value={form.navigationStyle}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      navigationStyle: e.target.value as "default" | "custom",
                    })
                  }
                >
                  <option value="custom">custom</option>
                  <option value="default">default</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Features</label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.isPreviewImageSupportEnabled}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isPreviewImageSupportEnabled: e.target.checked,
                      })
                    }
                  />
                  Enable LQIP Preview Images
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.isSearchEnabled}
                    onChange={(e) => setForm({ ...form, isSearchEnabled: e.target.checked })}
                  />
                  Enable Notion Search
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.showPageSocial}
                    onChange={(e) => setForm({ ...form, showPageSocial: e.target.checked })}
                  />
                  Show Page Social Sidebar
                </label>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>Navigation Links (JSON)</label>
                <textarea
                  className={styles.textarea}
                  value={form.navigationLinksJson}
                  onChange={(e) => setForm({ ...form, navigationLinksJson: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Page URL Overrides (JSON)</label>
                <textarea
                  className={styles.textarea}
                  value={form.pageUrlOverridesJson}
                  onChange={(e) => setForm({ ...form, pageUrlOverridesJson: e.target.value })}
                />
              </div>
            </div>

            <h2 className={styles.cardTitle} style={{ marginTop: 20 }}>
              Social Links (optional)
            </h2>
            <div className={styles.grid}>
              {(
                [
                  ["twitter", "Twitter"],
                  ["github", "GitHub"],
                  ["linkedin", "LinkedIn"],
                  ["youtube", "YouTube"],
                  ["zhihu", "Zhihu"],
                  ["mastodon", "Mastodon URL"],
                  ["newsletter", "Newsletter URL"],
                ] as const
              ).map(([key, label]) => (
                <div className={styles.field} key={key}>
                  <label className={styles.label}>{label}</label>
                  <input
                    className={styles.input}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className={styles.btnRow}>
              <button type="submit" disabled={savingConfig} className={`${styles.btn} ${styles.btnPrimary}`}>
                {savingConfig ? "Saving..." : "Save Configuration"}
              </button>
              <button type="button" onClick={handleExportConfig} className={styles.btn}>
                Export Config
              </button>
              <button type="button" onClick={() => importFileRef.current?.click()} className={styles.btn}>
                Import Config
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportConfigFile}
                style={{ display: "none" }}
              />
            </div>
          </form>
        )}

        {tab === "jobs" && (
          <>
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>1. URL Index Job (Notion &rarr; Redis)</span>
                <span className={`${styles.badge} ${indexJob ? styles[`badge_${indexJob.status}`] || "" : ""}`}>
                  {indexJob?.status || "idle"}
                </span>
              </div>
              <p className={styles.hint}>
                Crawls reachable Notion pages in resumable time-boxed chunks and checkpoints progress to Redis. Safe to
                resume if a serverless function times out.
              </p>
              {indexJob && (
                <div className={styles.stats}>
                  <span>Indexed: {indexJob.indexedCount ?? sitemapCount}</span>
                  <span>Processed: {indexJob.processedCount ?? 0}</span>
                  <span>Queue: {indexJob.queueLength ?? 0}</span>
                  <span>Errors: {indexJob.errorCount ?? 0}</span>
                  {indexJob.updatedAt && <span>Updated: {new Date(indexJob.updatedAt).toLocaleString()}</span>}
                </div>
              )}
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={forceFreshJob} onChange={(e) => setForceFreshJob(e.target.checked)} />
                Force fresh fetch from Notion (bypass Next.js cache)
              </label>
              <div className={styles.btnRow}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={runningJobType !== null}
                  onClick={() => runJobLoop("index", "run")}
                >
                  {runningJobType === "index"
                    ? "Running..."
                    : indexJob?.status === "paused" || indexJob?.status === "running"
                      ? "Resume Index"
                      : "Start Index"}
                </button>
                <button
                  className={styles.btn}
                  disabled={runningJobType !== null}
                  onClick={() => runJobLoop("index", "restart")}
                >
                  Restart from Scratch
                </button>
                {runningJobType === "index" && (
                  <button
                    className={styles.btn}
                    onClick={() => {
                      stopLoopRef.current = true;
                    }}
                  >
                    Stop After Current Chunk
                  </button>
                )}
                <button
                  className={styles.btn}
                  disabled={runningJobType !== null}
                  onClick={() => runJobLoop("index", "reset")}
                >
                  Reset State
                </button>
                <button className={styles.btn} onClick={loadJobs}>
                  Refresh Status
                </button>
              </div>
              {indexJob?.logs && indexJob.logs.length > 0 && (
                <pre className={styles.logs}>{indexJob.logs.join("\n")}</pre>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>2. Page Pre-cache Job (Next.js Runtime Cache)</span>
                <span className={`${styles.badge} ${precacheJob ? styles[`badge_${precacheJob.status}`] || "" : ""}`}>
                  {precacheJob?.status || "idle"}
                </span>
              </div>
              <p className={styles.hint}>Warms Next.js runtime cache for all indexed pages in resumable chunks.</p>
              {precacheJob && (
                <div className={styles.stats}>
                  <span>
                    Progress: {precacheJob.completedCount ?? 0} / {precacheJob.totalCount ?? 0}
                  </span>
                  <span>Remaining: {precacheJob.remainingCount ?? 0}</span>
                  <span>Failed: {precacheJob.failedCount ?? 0}</span>
                </div>
              )}
              <label className={styles.checkboxRow}>
                <input type="checkbox" checked={warmRoutes} onChange={(e) => setWarmRoutes(e.target.checked)} />
                Also warm rendered HTTP routes
              </label>
              <div className={styles.btnRow}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={runningJobType !== null}
                  onClick={() => runJobLoop("precache", "run")}
                >
                  {runningJobType === "precache"
                    ? "Running..."
                    : precacheJob?.status === "paused" || precacheJob?.status === "running"
                      ? "Resume Pre-cache"
                      : "Start Pre-cache"}
                </button>
                <button
                  className={styles.btn}
                  disabled={runningJobType !== null}
                  onClick={() => runJobLoop("precache", "restart")}
                >
                  Restart Pre-cache
                </button>
                {runningJobType === "precache" && (
                  <button
                    className={styles.btn}
                    onClick={() => {
                      stopLoopRef.current = true;
                    }}
                  >
                    Stop After Current Chunk
                  </button>
                )}
                <button
                  className={styles.btn}
                  disabled={runningJobType !== null}
                  onClick={() => runJobLoop("precache", "reset")}
                >
                  Reset State
                </button>
              </div>
              {precacheJob?.logs && precacheJob.logs.length > 0 && (
                <pre className={styles.logs}>{precacheJob.logs.join("\n")}</pre>
              )}
            </div>
          </>
        )}

        {tab === "cache" && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Cache Management (Next.js & Cloudflare)</span>
            </div>
            <p className={styles.hint}>
              Enter a full URL, encoded path, or raw slug prefix (e.g. <code>/</code> for all pages,{" "}
              <code>Projects</code>, or <code>Projects/WireGuard Watcher</code>).
            </p>
            <div className={styles.field}>
              <input
                className={styles.input}
                placeholder="e.g. / or Projects or Projects/WireGuard Watcher"
                value={clearCacheTarget}
                onChange={(e) => setClearCacheTarget(e.target.value)}
              />
            </div>
            <div className={styles.btnRow}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={clearingCache || refreshingPage}
                onClick={() => handleClearCache(clearCacheTarget || "/")}
              >
                {clearingCache ? "Clearing..." : "Clear Cache"}
              </button>
              <button
                className={styles.btn}
                disabled={clearingCache || refreshingPage}
                onClick={() => handleRefreshSinglePage(clearCacheTarget || "/")}
              >
                {refreshingPage ? "Refreshing..." : "Refresh from Notion"}
              </button>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={clearingCache || refreshingPage}
                onClick={() => handleClearCache("/")}
              >
                Clear All Cache (/)
              </button>
            </div>
          </div>
        )}

        {tab === "pages" && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Indexed Pages ({filteredPages.length})</span>
              <button className={styles.btn} onClick={loadSitemap}>
                Reload
              </button>
            </div>
            <div className={styles.field}>
              <input
                className={styles.input}
                placeholder="Filter by slug or pageId..."
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
              />
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>URL Slug</th>
                  <th>Notion Page ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map(([slug, id]) => (
                  <tr key={slug}>
                    <td>
                      <Link href={`/${slug}`} target="_blank">
                        /{slug}
                      </Link>
                    </td>
                    <td>
                      <code>{id}</code>
                    </td>
                    <td>
                      <button className={styles.btn} onClick={() => handleRefreshSinglePage(slug)}>
                        Refresh
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPages.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "#57606a" }}>
                      No indexed pages found. Run the URL Index job first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.wrapper}>
          <div className={styles.container}>Loading...</div>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
