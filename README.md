# Kleros Events

The public record of every event Kleros hosts or takes part in (conferences, side events, hackathons, meetups, Spaces), with the talks, slides and recordings to match. It doubles as promotion for Kleros: every page points visitors to the products, socials and the team.

## What's in it

**For visitors**
- **Events** by Kleros' role: hosted, co-hosted, speaking, sponsoring, booth, judging, attending. Filter by upcoming/past/month, type, topic and search.
- **Event pages** list the Kleros team who'll be there, the agenda, talks and materials, and an "Ask the speaker" Q&A with upvotes. A "Meet Kleros" box lets visitors request a meeting or book a team member's calendar, and product promos are picked from the event's topics.
- **Talk player:** the PDF deck is synced to the audio recording. Each slide change is timestamped, the timeline is split by slide, clicking a slide jumps the audio, and there are notes per slide.
- **My events** (magic-link sign-in): saved, going and attended events, private notes, recommendations from topics, region and role, "Talks you missed", and "Continue watching".
- Calendar file for every event (`/events/<slug>/calendar.ics`) and a projector view for live Q&A (`/events/<slug>/live`).

**For the Kleros team** (`/admin`, for accounts with team access, see "Team access" below)
- Events desk: Upcoming, Past and Drafts tabs, each row with **Run live** (the host console at `/events/<slug>/host`), **Edit** and **View**. Past events with no materials are flagged "Needs materials". A Meeting requests tab holds the "Meet Kleros" inbox.
- Event editor (`/admin/events/<id>`): Details, Agenda, Kleros team and Materials sections under a header with **Run live** and **View public page**.
- **Access** (`/admin/access`, master admin only): who has team access, give access by email, remove or block.
- **Add a talk:** upload the PDF, then either present and record live in the browser (slide changes are stamped automatically) or upload an existing recording and tap Next as it plays back. Check the timing, add notes per slide, and save.
- Team roster with X handles and booking links.

## Stack

Next.js 15 (App Router) · Supabase (Postgres, auth, storage, realtime) · pdf.js · deploys to Vercel or Netlify.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema:** in the SQL editor, run the files in `supabase/migrations/` in order. Optionally run `supabase/seed.sql` for example events; they are marked "Example" and can be removed with `delete from events where is_example;`.
3. **Auth:** under Authentication → URL configuration, set the Site URL to your deployed URL, and add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` as redirect URLs. Email magic links work out of the box.
4. **Env:** copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`.
5. **Run:** `npm install && npm run dev`, then open http://localhost:3000.
6. **Team access** (needs `0003_access.sql`):
   - Anyone signing in with an `@kleros.io` email gets team access automatically.
   - `weiwei@kleros.io` is the master admin (`profiles.is_admin`). Only the master admin can open `/admin/access`, add people by email (stored in `team_access`), remove them, or block an address. A block removes access even for an `@kleros.io` email, but never for the master admin. Changes apply at once to existing accounts and on first sign-in for new ones.
   - Nobody can change their own `is_team` or `is_admin`, and `is_admin` can only be changed from the SQL editor, for example `update profiles set is_admin = true where id = (select id from auth.users where email = 'them@kleros.io');`
   - Anonymous guests (QR questions) never get team access.

## At the venue: event mode

Open an event while signed in with a Kleros account and press **Event mode** (or go to `/events/<slug>/live`). Put that tab on the projector.

- The screen shows the event title, the questions people send, and a QR code to `/q/<slug>`. Guests scan it and ask or upvote from their phone with no account (Supabase anonymous sign-in must be on: Authentication → Sign In / Providers → Allow anonymous sign-ins).
- Move the mouse to bring up the control bar. **Start recording** records from the laptop microphone. Audio is written to the browser's storage every few seconds, so a crash or a closed lid doesn't lose it; reopen event mode and press **Recover unsaved recording**.
- **Stop**, name the recording and press **Save to event**. It uploads to the event page as an audio file. **Download copy** keeps a local backup.
- Hover a question to show it big, mark it answered or hide it.

## Deploy

- **Vercel:** import the repo, add the env vars from `.env.example`, and deploy.
- **Netlify:** import the repo; `netlify.toml` holds the build settings. Steps, env vars, domain and sign-in notes are in [docs/deploy-netlify.md](docs/deploy-netlify.md).

Then point `events.kleros.io` at the host and make sure the Supabase redirect URLs include it.

## Notes

- Uploads go to the public `materials` storage bucket. Only team accounts can write to it. The free Supabase tier caps single files at 50 MB, so keep talk recordings as compressed audio (the in-browser recorder makes about 20 MB per hour).
- Keynote and PowerPoint decks need exporting to PDF first. Google Slides, YouTube and X posts can be added as links.
- Data model and access rules are in `supabase/migrations/0001_init.sql`. Visitors only ever see their own attendance, notes and watch history.
