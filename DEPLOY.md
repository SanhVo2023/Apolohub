# Deploy Guide — Content Hub + thin frontends (Vercel, manual via dashboard)

> **Order matters.** The hub MUST be public before any frontend deploys — frontends
> fetch `HUB_API_URL` at build time AND at ISR-revalidate time. A frontend pointed at
> `localhost:3001` will build empty/broken on Vercel.

---

## STEP 1 — Deploy the Content Hub (`hub/`) first

The hub is the one app with a database. It needs Fluid Compute (connection reuse) + the Supabase pooler.

1. **New Vercel project** → import the `hub/` directory (or the repo subpath if you put the workspace in git).
   - Framework preset: **Next.js** (auto-detected). Root directory: `hub`.
2. **Environment variables** (Project → Settings → Environment Variables) — copy from `hub/.env.local`:
   | Key | Value |
   |---|---|
   | `DATABASE_URI` | `postgresql://postgres.zxmdegfnjbvytjnwfhfq:6WD%23JKug2_S.Yd7@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres` |
   | `PAYLOAD_SECRET` | `GijI0DDTTyWlpLkrQ8_Lh8cRhormMcKHBTRixNjvOGU` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-hub-domain>` (set after first deploy, then redeploy) |
   (The `%23` encoding of the `#` in the password is REQUIRED in the URI.)
3. **Enable Fluid Compute**: Project → Settings → Functions → Fluid Compute = ON. (Reuses the pg connection across invocations — prevents Payload cold-start pool churn. Without it the hub can exhaust the Supabase pooler under traffic.)
4. **Node version**: 22 (Project → Settings → Build & Development → Node.js Version).
5. Deploy. Then:
   - Visit `https://<hub-domain>/admin` → log in (`matvietdesignteam@gmail.com` / `K7kYhVkPa0_sblTw`) → **change the password**.
   - Smoke test public read: `curl 'https://<hub-domain>/api/site-configs?where%5Bdomain%5D%5Bequals%5D=luatsudansu.vn'` → expect JSON.
6. **Note the public hub URL** — every frontend's `HUB_API_URL` points here.

**Security follow-up (decide ecosystem-wide):** Supabase flagged RLS disabled on all `hub.*` tables. Access is enforced at the Payload layer and the hub connects as the `postgres` role (not the anon key, which is never exposed to frontends). For defense-in-depth you can enable RLS + policies later — don't block the deploy on it, but track it.

---

## STEP 2 — Deploy a frontend (e.g. `sites/frontends/luatsudansu.vn`)

The frontend has NO database. It fetches everything from the hub.

1. **New Vercel project** → import `sites/frontends/luatsudansu.vn`. Framework: Next.js. Root directory: that path.
2. **Environment variables** (from the site's `.env.local`, but point `HUB_API_URL` at the PUBLIC hub):
   | Key | Value |
   |---|---|
   | `HUB_API_URL` | `https://<hub-domain>` (the public hub from Step 1 — NOT localhost) |
   | `SITE_DOMAIN` | `luatsudansu.vn` |
   | `NEXT_PUBLIC_SITE_URL` | `https://luatsudansu.vn` |
   | `CONTACT_HUB_URL` | (from `PM_CREDENTIALS.md` → Contact Form Hub) |
3. Node version: 22. Deploy.
4. **Custom domain**: add `luatsudansu.vn` (Project → Settings → Domains). Point DNS per Vercel's instructions (A/CNAME).
5. Smoke test: home renders, a rendition page shows real headings (not `##`), `/lien-he` form submits (check a row lands in the hub `contact-submissions`).

Repeat Step 2 per site (each its own Vercel project). Same template, only env differs.

---

## Local preview (no deploy)

The hub dev server is running on `http://localhost:3001`. To preview a frontend locally:
```
cd sites/frontends/luatsudansu.vn
# .env.local already has HUB_API_URL=http://localhost:3001
npm run build && npm start -- -p 3201   # → http://localhost:3201
```

---

## Content review reminder

luatsudansu.vn's 3 renditions are `status: published` (auto-publish was chosen). Once the
frontend is live they are publicly visible. **Mr Hien should review the AI-authored statutory
claims promptly** — to unpublish pending review, flip `status` to `draft` in the hub admin
(the frontend's access control hides non-published renditions automatically).
