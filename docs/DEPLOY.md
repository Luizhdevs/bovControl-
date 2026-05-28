# BovControl — Deploy Guide

## Stack

| Layer    | Service              |
|----------|----------------------|
| App      | Vercel               |
| Database | Neon (PostgreSQL)    |
| Storage  | Cloudflare R2        |
| Auth     | NextAuth v5 (Google) |

---

## 1. Prerequisites

- Node 20+, `npm`, `tsx` installed locally
- Vercel CLI: `npm i -g vercel`
- Prisma CLI: `npm i -g prisma`
- Cloudflare account with R2 enabled
- Google OAuth app (Client ID + Secret)

---

## 2. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **connection string** (`postgresql://…?sslmode=require`)
3. Run migrations against production:
   ```bash
   DATABASE_URL="<neon-url>" npx prisma migrate deploy
   ```
   > Never run `prisma db push` or `migrate reset` on production.

---

## 3. Cloudflare R2

1. In the Cloudflare dashboard → R2 → Create bucket (e.g. `bovcontrol-prod`)
2. Enable **Public access** on the bucket (or configure a custom domain)
3. Create an **API token** with *Object Read & Write* permissions scoped to the bucket
4. Note down:
   - **Account ID** (top right of R2 page)
   - **Access Key ID**
   - **Secret Access Key**
   - **Public bucket URL** (`https://pub-xxx.r2.dev` or your custom domain)

---

## 4. Google OAuth

1. [console.cloud.google.com](https://console.cloud.google.com) → Credentials → Create OAuth 2.0 Client
2. Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
3. Note **Client ID** and **Client Secret**

---

## 5. Environment Variables (Vercel)

Set these in **Vercel → Project → Settings → Environment Variables** (Production):

```env
# NextAuth
NEXTAUTH_SECRET=<random 32+ char secret>   # openssl rand -base64 32
NEXTAUTH_URL=https://<your-domain>

# Google OAuth
GOOGLE_CLIENT_ID=<from step 4>
GOOGLE_CLIENT_SECRET=<from step 4>

# Database
DATABASE_URL=<neon connection string>

# Cloudflare R2
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret key>
R2_BUCKET_NAME=bovcontrol-prod
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## 6. First Deploy

```bash
# Install deps + run TypeScript check
npm ci
npm run deploy:check

# Push to Vercel (first time)
vercel --prod
```

After deploy, Vercel will pick up env vars and build automatically on every push to `main`.

---

## 7. Seed Initial Data (OWNER user + Farm)

Production does NOT use seed scripts. The first user is created via Google login.  
The first farm must be created by an admin via the app UI (farm switcher → Nova Fazenda).

> **NEVER** run `npm run db:seed` or `npm run db:seed:dev` against production.

---

## 8. Clearing Dev Data Before Going Live

If you ran dev seeds against a production-like database:

```bash
# Preview what will be deleted
DATABASE_URL="<prod-url>" tsx scripts/production-setup.ts

# Execute deletions
DATABASE_URL="<prod-url>" tsx scripts/production-setup.ts --execute
```

Preserves: Users, Farms, FarmUsers, Invites.  
Deletes: Animals, Lots, Pastures, Milk, Feed, Health, Reproduction records.

---

## 9. Ongoing Deployments

Vercel auto-deploys on push to `main`. For schema changes:

```bash
# After merging a migration PR:
npm run db:migrate:prod
```

Which runs `prisma migrate deploy` with `$DATABASE_URL` (must be set in your shell or CI).

---

## 10. Health Check

`GET /api/health` returns:

```json
{
  "status": "ok",
  "database": "ok",
  "storage": { "provider": "r2", "status": "ok" },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

HTTP 200 = healthy. HTTP 503 = degraded (check `database` / `storage.status`).

---

## 11. Storage Migration (local → R2)

If you have existing local uploads that need migrating to R2:

```bash
# Dry run — shows what would be migrated
npm run storage:migrate:dry

# Execute migration
npm run storage:migrate

# Optionally delete local files after migration
tsx scripts/storage-migrate.ts --delete-local
```

---

## Checklist

- [ ] Neon DB created and `DATABASE_URL` set
- [ ] R2 bucket created, public access enabled, API token created
- [ ] Google OAuth app configured with production redirect URI
- [ ] All env vars set in Vercel
- [ ] `npm run deploy:check` passes locally
- [ ] `prisma migrate deploy` run against production DB
- [ ] First deploy via `vercel --prod`
- [ ] `/api/health` returns `{ "status": "ok" }`
- [ ] Google login works end-to-end
- [ ] Photo upload and display works (R2)
