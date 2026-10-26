# Updates from socials and channels

The site keeps itself current from three places:

| Source | How it reaches the site | How often |
|---|---|---|
| Luma (Kleros \| Events and Wei Wei's calendars) | `sync_luma()` in Supabase reads Luma directly | every hour |
| X, LinkedIn, YouTube, Kleros blog, team Slack channels | a daily Claude check writes `public/updates/feed.json`, then `sync_feed()` in Supabase applies it | daily check, applied within the hour |
| Anything the team adds on the site | Events desk, Record, Add files | instantly |

Team members can press **Sync now** on `/admin` to apply Luma and the feed straight away.

## The daily check

Each day the check:

1. Reads what is already on the site: `supabase/content/2026-10-event-history.sql` (the event list and slugs) and the items already in `public/updates/feed.json`.
2. Looks for anything from the last 10 days:
   - posts from @Kleros_io on X, and from the team: @federicoast, @clesaege, @williamhwgeorge, @JayBuidl, @fortuvp, @alex__eth, @nachikeighth;
   - the Kleros LinkedIn page;
   - new uploads on the Kleros YouTube channel (`UCEjwygFVVrSXhPNEKfweypA`);
   - blog.kleros.io;
   - Slack channels: #general-event-organisation, #comms-and-marketing, #communication-team, #announcements, plus any event channel such as #devcon-2026-mumbay or #ethcc-2027.
3. Appends new items to `feed.json`, then commits and pushes the change to main. Vercel publishes the file, and the database picks it up at minute 17 of the next hour.

### What gets in

Only confirmed facts get in. Every item must carry a `source`: a public link (a post, video, Luma page, conference agenda or blog post) that shows the fact.

- **A new event** needs a public post from Kleros, a team member, or the organiser. The post must name Kleros or the team member, and give the event's name and date. Plans that appear only in Slack ("we might go to…") stay out.
- **Recordings, slides, photo albums and recap posts** link to an event that is already on the site.
- **Slack** is for leads: it points to links and to events that are already public. Private discussion, budgets, internal names and anything marked internal never go in the feed.

When in doubt, the item stays out and the check mentions it in its run summary instead.

### Copy rules

Copy follows the Kleros writing rules:

- No em dashes.
- No first person ("we", "our").
- No hashtags, no exclamation marks, no marketing-speak.
- Full names on first mention (Fortunato Cinquepalmi, Federico Ast).
- Descriptions are specific, saying what Kleros did there. For example: "William George spoke on dispute kits", not just "Kleros attended".

## Feed format

```json
{
  "items": [
    {
      "id": "2026-10-27-x-1849000000000000000",
      "kind": "event",
      "source": "https://x.com/Kleros_io/status/1849000000000000000",
      "event": {
        "slug": "lisbon-legal-tech-week-2026",
        "title": "Lisbon Legal Tech Week",
        "kleros_role": "speaking",
        "organizer": "Legal Tech Portugal",
        "event_type": "Conference",
        "starts_on": "2026-11-20",
        "ends_on": "2026-11-21",
        "city": "Lisbon",
        "country": "Portugal",
        "region": "Europe",
        "url": "https://example.org/agenda",
        "cover_path": "https://pbs.twimg.com/media/XXXX?format=jpg&name=large",
        "description": "Federico Ast speaks on decentralized justice for cross-border e-commerce disputes.",
        "topics": ["Decentralized justice", "Access to justice"]
      }
    },
    {
      "id": "2026-10-27-yt-dQw4w9WgXcQ",
      "kind": "material",
      "source": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "event_slug": "devconnect-buenos-aires-2025",
      "material_kind": "video",
      "title": "William George: Dispute kits in Kleros V2",
      "speaker": "William George",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  ]
}
```

- `id` is unique and never reused: the date found, plus the source type, plus the post or video id. Items are applied once. Later edits made on the site are kept, because an applied id is not applied again.
- **For an existing event,** `event` carries `slug` plus only the fields to fill in or correct, for example a newer `cover_path` or a `recap`.
- **For a new event,** `slug` follows the existing pattern `name-city-year` (lowercase, hyphens). It needs at least `title` and `starts_on`.
- `kleros_role` is one of `host`, `co_host`, `speaking`, `sponsor`, `booth`, `judging`, `attending`.
- `region` is one of `Europe`, `Asia`, `Africa`, `Oceania`, `Latin America`, `North America`, `Online`.
- `material_kind` is one of `video`, `slides`, `audio`, `doc`, `image`, `link`, `social`.
- **Images:** use the image the post itself uses (`pbs.twimg.com/media/...?format=jpg&name=large`, `images.lumacdn.com/...`, or the organiser's own image). Never leave an event without one.
- **Failures:** an item that fails (for example, its event slug does not exist yet) is retried every hour. The reason is shown in the `feed_applied` table.
