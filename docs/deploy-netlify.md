# Deploying on Netlify

The site runs on Netlify with no code changes. `netlify.toml` holds the build settings, and Netlify adds its Next.js adapter (OpenNext) on its own. A local `netlify build` of this repo (Netlify CLI 27.14) completes, with the middleware bundled as an edge function.

The Vercel deployment can keep running alongside. Both read the same Supabase database, so either one can be switched off later without losing anything.

## 1. Create the site

1. In Netlify, go to **Add new project → Import an existing project → GitHub**, then pick `weiwei-ooi/kleros-events`, branch `main`.
2. Leave the build settings empty. They come from `netlify.toml`: `npm run build`, publish `.next`, Node 22.

The repository belongs to Wei Wei's personal GitHub account, so Netlify may not list it for someone else. Two ways around that:

- **Fork it** into an account Netlify can read, such as the Kleros GitHub organization, and import the fork. New changes then reach the site when someone presses **Sync fork** on GitHub. This needs the repository to be public.
- **Allow the Netlify app** on the original. Wei Wei does this once at https://github.com/apps/netlify/installations/new: choose `weiwei-ooi`, then **Only select repositories**, then `kleros-events`. New changes then deploy on their own.

## 2. Environment variables

Set these under **Site configuration → Environment variables**.

| Variable | Needed | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Project settings → API (the same value as in the Vercel project) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Same place. This key is public by design; the database rules protect the data. |
| `NEXT_PUBLIC_SITE_URL` | no | Leave unset. Netlify's main site address is used for share links, QR codes and calendar files, and that becomes `https://events.kleros.io` once the domain is set as primary. |
| `GROQ_API_KEY` | no | Turns on transcripts of recordings. Mark it as secret. |
| `ANTHROPIC_API_KEY` | no | Turns on talk summaries and the site assistant (the Ask button). Mark it as secret. Other `ASK_*` settings are in the README under "Site assistant". |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Lets a failed transcript run always record its error, and keeps the assistant's question limits in the database (with migration `0013_ask.sql`). Mark it as secret. |

Changing a variable needs a new deploy before it takes effect.

## 3. Domain

1. In **Domain management**, add `events.kleros.io` and set it as the primary domain.
2. In Cloudflare, point a `CNAME` record for `events` at the Netlify address, for example `kleros-events.netlify.app`. Set it to **DNS only** (grey cloud).
3. Run one more deploy, so that share links and QR codes pick up the domain.

## 4. Sign-in

Supabase only sends people back to addresses on its allow list.

- `https://events.kleros.io/**` is already on that list, so sign-in works on the domain without further changes.
- To sign in on the `*.netlify.app` address as well, add `https://<site-name>.netlify.app/**` under **Supabase → Authentication → URL configuration → Redirect URLs**. Add only the exact site name, never a `*.netlify.app` wildcard: a wildcard would let any Netlify site receive sign-in links.
- Deploy previews cannot sign in. Pages that need no sign-in work as usual.

## What else to know

- **Hourly jobs.** Luma and the socials feed run inside Supabase (pg_cron). They do not depend on the host. The feed is read from `https://events.kleros.io/updates/feed.json`, falling back to `https://kleros-events.vercel.app/updates/feed.json` (migration 0011).
- **Time limit.** Netlify ends every server request after 60 seconds, where Vercel allowed this app 300. The transcript route detects Netlify at build time and splits its work so that each step fits: the transcript in one request, the summary in the next. A very long summary on a slow model can still run past 60 seconds. If that happens, set `ANTHROPIC_MODEL` to a faster model.
- **Middleware** (session refresh for Supabase) runs as a Netlify Edge Function. It needs no settings.
- **Images** go through Netlify Image CDN. Supabase storage is already allowed in `next.config.ts`.
