# notion-site

A self-hostable, Docker-ready Notion website powered by Next.js App Router and runtime Redis configuration.

Based on [transitive-bullshit/nextjs-notion-starter-kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit). Refer to the upstream repository for general Notion setup, page sharing, and feature documentation.

## Key Differences from Upstream

- **Next.js App Router**: Migrated from the legacy `pages/` router to the `app/` router (Next.js 16 + React 19), including route handlers for `/sitemap.xml`, `/robots.txt`, `/feed`, `/manifest.json`, `/favicon*`, and `/api/social-image`.
- **Runtime Configuration in Redis**: Site configuration (`rootNotionPageId`, `domain`, metadata, social links, navigation, URL overrides, etc.) is stored in Redis and loaded at runtime, falling back to [`site.config.ts`](./site.config.ts). This allows building a single generic Docker image without baking site-specific config at build time.
- **Built-in Admin Dashboard (`/$admin`)**: Web UI for managing runtime configuration, running site indexing and precaching jobs, inspecting/purging caches, and managing the sitemap (`/api/admin/*`).
- **Token-Protected Management & Refresh**: Protected by the `TOKEN` environment variable for `/$admin` login and cache refresh endpoints (`/api/refresh`, `/api/auth`, `/api/sign`).
- **Cloudflare Cache Purge**: Optional integration via `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` to purge Cloudflare edge cache when content or config changes.
- **Containerized Deployment**: Includes a multi-stage [`Dockerfile`](./Dockerfile) and a GitHub Actions workflow ([`.github/workflows/docker-publish.yml`](./.github/workflows/docker-publish.yml)) that publishes images to GitHub Packages (`ghcr.io`) on `v*` tags.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `REDIS_URL` | Yes | Redis connection string (e.g. `redis://user:pass@host:6379`) used for runtime config, sitemap, and cache persistence. Falls back to in-memory storage if unset. |
| `TOKEN` | Yes | Secret token required to log in to `/$admin` and call protected refresh/admin APIs. |
| `REDIS_NAMESPACE` | No | Key prefix in Redis (default: `notion`). |
| `NOTION_API_BASE_URL` | No | Custom Notion API base URL if needed. |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare API token for automatic edge cache purging. |
| `CLOUDFLARE_ZONE_ID` | No | Cloudflare Zone ID paired with `CLOUDFLARE_API_TOKEN`. |
| `ALLOWED_DEV_ORIGINS` | No | Comma-separated allowed origins for `next dev` (e.g. `dev.example.com,*.example.com`). |

See [`.env.example`](./.env.example) for additional optional variables.

## Quick Deployment

### Option 1: Docker (Recommended)

1. **Pull or build the image**:

   ```bash
   docker pull ghcr.io/<owner>/<repo>:latest
   # or build locally:
   docker build -t notion-site .
   ```

2. **Run the container** (with Redis available):

   ```bash
   docker run -d \
     --name notion-site \
     -p 3000:3000 \
     -e REDIS_URL="redis://your-redis-host:6379" \
     -e TOKEN="your-admin-secret-token" \
     ghcr.io/<owner>/<repo>:latest
   ```

3. **Configure your site**:
   Open `http://localhost:3000/$admin`, sign in with `TOKEN`, set your `rootNotionPageId`, `domain`, and site metadata, then save. Run the indexing/precache jobs from the **Jobs** tab if needed.

### Option 2: Run from Source

```bash
npm ci
cp .env.example .env.local
# Edit .env.local to set REDIS_URL and TOKEN
npm run build
npm run start
```

For local development:

```bash
npm run dev
```

## License

MIT — see [`license`](./license).
