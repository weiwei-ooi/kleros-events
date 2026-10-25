# Kleros Events

The public record of every event Kleros hosts or takes part in (conferences, side events, hackathons, meetups, Spaces), with the talks, slides and recordings to match. It doubles as promotion for Kleros: every page points visitors to the products, socials and the team.

## What's in it

**For visitors**
- **Events** by Kleros' role: hosted, co-hosted, speaking, sponsoring, booth, judging, attending. Filter by upcoming/past/month, type, topic and search.
- **Event pages** list the Kleros team who'll be there, the agenda, talks and materials, and an "Ask the speaker" Q&A with upvotes. A "Meet Kleros" box lets visitors request a meeting or book a team member's calendar, and product promos are picked from the event's topics.
- **Talk player:** the PDF deck is synced to the audio recording. Each slide change is timestamped, the timeline is split by slide, clicking a slide jumps the audio, and there are notes per slide.
- **My events** (magic-link sign-in): saved, going and attended events, private notes, recommendations from topics, region and role, "Talks you missed", and "Continue watching".
- Calendar file for every event (`/events/<slug>/calendar.ics`) and a projector view for live Q&A (`/events/<slug>/live`).

**For the Kleros team** (`/admin`, for accounts with `profiles.is_team = true`)
- Events desk: all events, drafts, going counts, a list of past events still missing materials, and the meeting request inbox.
- Event editor: details, recap, agenda, which team members attend, and materials.
- **Add a talk:** upload the PDF, then either present and record live in the browser (slide changes are stamped automatically) or upload an existing recording and tap Next as it plays back. Check the timing, add notes per slide, and save.
- Team roster with X handles and booking links.

## Stack

Next.js 15 (App Router) · Supabase (Postgres, auth, storage, realtime) · pdf.js · deploys to Vercel.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema:** in the SQL editor, run the files in `supabase/migrations/` in order. Optionally run `supabase/seed.sql` for example events; they are marked "Example" and can be removed with `delete from events where is_example;`.
3. **Auth:** under Authentication → URL configuration, set the Site URL to your deployed URL, and add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` as redirect URLs. Email magic links work out of the box.
4. **Env:** copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`.
5. **Run:** `npm install && npm run dev`, then open http://localhost:3000.
6. **Team access:** anyone who signs in with an `@kleros.io` email is a team member automatically. To add someone else, run
   `update profiles set is_team = true where id = (select id from auth.users where email = 'them@example.com');`

## Deploy (Vercel)

Import the repo in Vercel, add the three env vars, and deploy. Point a domain such as `events.kleros.io` at it, then update `NEXT_PUBLIC_SITE_URL` and the Supabase redirect URLs.

## Notes

- Uploads go to the public `materials` storage bucket. Only team accounts can write to it. The free Supabase tier caps single files at 50 MB, so keep talk recordings as compressed audio (the in-browser recorder makes about 20 MB per hour).
- Keynote and PowerPoint decks need exporting to PDF first. Google Slides, YouTube and X posts can be added as links.
- Data model and access rules are in `supabase/migrations/0001_init.sql`. Visitors only ever see their own attendance, notes and watch history.
