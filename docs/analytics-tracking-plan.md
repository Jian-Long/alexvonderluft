# Alex Vonderluft analytics tracking plan

## Architecture and ownership

- Production site: `https://alexvonderluft.com`
- Hosting: GitHub Pages (static HTML, CSS and JavaScript)
- Analytics processor: Umami Cloud, site domain `alexvonderluft.com`
- Website ID: `13e0d910-b220-4778-8b9b-09d75f1f795f` (public tracker identifier, not an admin secret)
- Dashboard: private Umami Cloud account; never embed an API token in this repository
- Tracker: `https://cloud.umami.is/script.js`, loaded automatically without cookies or fingerprinting
- Notice mode: no consent banner; transparent privacy notice, Do Not Track support and browser-level opt-out
- Development traffic: disabled on `localhost`, `127.0.0.1`, `.local` and `file:`
- Administrator exclusion: set `localStorage.alex_analytics_ignore = "true"`

The Umami Cloud account and site exist. The selected data region, DPA, controller/contact details, retention selection and legal review remain owner tasks.

## Data minimisation rules

- Never send names, email addresses, chat contents, account handles, tokens or arbitrary query parameters.
- Only these campaign parameters may be sent: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `src` after normalisation.
- Referrers are reduced to origin and pathname. Destination links are reduced to platform, type and hostname.
- Error tracking sends an error category only, never messages, stack traces or source URLs.
- No fingerprinting and no custom persistent session identifier is sent.
- City data should be disabled or hidden for small samples. Prefer country-level reporting.

## Source taxonomy

| Canonical source | Accepted short values / referrers | Default medium |
| --- | --- | --- |
| `instagram` | `ig`, `instagram`, instagram.com | `social` |
| `snapchat` | `snap`, `snapchat`, snapchat.com | `social` |
| `telegram` | `tg`, `telegram`, t.me, telegram.me | `community` |
| `twitter` | `x`, `twitter`, x.com, twitter.com, t.co | `social` |
| `onlyfans` | `of`, `onlyfans`, onlyfans.com | `creator` |
| `google` | google search referrer | `organic` |
| `bing` | bing.com | `organic` |
| `referral` | other valid external referrer | `referral` |
| `direct` | no campaign and no referrer | `none` |
| `unknown` | invalid or unclassifiable input | `unknown` |

Priority: valid UTM source → valid `src` alias → referrer → direct. Attribution is calculated for the current page only and is not stored in the visitor's browser.

## Campaign naming

- Lowercase English only.
- Use underscores or hyphens; never spaces.
- Keep names stable after launch.
- Never put personal or sensitive information in campaign parameters.

Format: `source / medium / campaign / content`.

Examples:

```text
instagram / bio / always_on / profile
instagram / story / csd_2026 / selfie_01
snapchat / story / party_july / story_03
telegram / channel / exclusive_offer / post_01
twitter / social / always_on / profile
```

## Event convention

Event names are lowercase snake_case. One physical click produces one primary semantic click event.

| Event | When | Key parameters |
| --- | --- | --- |
| `page_view` | Each normal document load; sent with `umami.track()` pageview payload | canonical page path, landing page, attribution, device class |
| `come_closer_click` | Homepage CTA | link name, position, destination type |
| `social_click` | Instagram, Snapchat, Telegram or X click | platform, link name, position, destination hostname |
| `exclusive_click` | Exclusive/OnlyFans entry click | platform, link name, position, destination type |
| `outbound_click` | Other external destination | platform, link name, position, destination hostname |
| `internal_navigation` | Tracked internal link not covered by a more specific event | link name, position, canonical destination path |
| `email_click` | `mailto:` click | link name and position; never the email address |
| `archive_open` | Archive interstitial opens/redirects | trigger (`manual` or `automatic`) |
| `scroll_depth` | First reach of 25, 50, 75 and 90 percent | depth and page path |
| Umami performance | Umami tracker Core Web Vitals collection | standard performance metrics managed by Umami |
| `javascript_error` | At most three errors per session | error category only |
| `error_404` | Custom 404 page | canonical requested path |

Common properties: `page_path`, `page_title`, `source`, `medium`, `campaign`, `content`, `device_type`, `link_name`, `link_position`, `platform`, `destination_type`, `destination_domain`.

## Link positions

`hero`, `come_closer`, `links_primary`, `links_secondary`, `footer`, `archive`, `stats`, `mobile_sticky_cta`, `privacy`.

## Funnels

Configure these in Umami Insights after the matching events have been received.

1. **Exclusive conversion** (sequential): `/` → `come_closer_click` → `/links.html` → `exclusive_click` → `archive_open`.
2. **Telegram conversion**: site entry → `/links.html` → `social_click` filtered by `platform=telegram`.
3. **Social follow conversion**: site entry → `social_click` filtered by platform (`instagram`, `snapchat`, or `twitter`).
4. **Content exploration**: `/` → `/archive.html` → `archive_open` → external click where available.

OnlyFans subscription completion cannot be verified from this website. Use an official OnlyFans tracking link/report if available; never label `exclusive_click` as a paid subscription.

## Dashboard configuration

Use the private Umami Cloud dashboard and create:

1. Overview: visitors, sessions, views, engagement, outbound/exclusive clicks and Exclusive CTR.
2. Sources: source/medium/campaign filters with Come Closer, Exclusive, Telegram and social goals.
3. Destinations: custom event Goals grouped by platform and destination type.
4. Source-to-destination: filter/export custom event properties by `source` and `platform`; a literal matrix requires a protected Stats API consumer, not GitHub Pages.
5. Funnels: the four definitions above, filtered by source and device.
6. Top pages: views, visitors, engagement, scroll depth and outbound goals.
7. Campaigns: UTM source/medium/campaign/content.
8. Devices: device, OS and browser. In-app browser classification is best-effort only.
9. Geography: country by default; hide city for low-volume segments.
10. Trends/realtime: native date comparison and realtime views.

Recommended custom-event Goals: `come_closer_click`, `social_click`, `exclusive_click`, `outbound_click`, `internal_navigation`, `email_click`, `archive_open`, `scroll_depth`, `error_404`.

## Metrics

- Exclusive CTR = unique `exclusive_click` conversions / relevant unique sessions.
- No outbound action = relevant sessions minus sessions with any outbound/social/exclusive/email event.
- Average engagement and bounce/exit definitions should use Umami's dashboard definitions rather than mixing CountAPI totals.

## Retention and access

- Start with the shortest retention that meets trend needs; recommended target: 13 months, subject to account-plan controls and legal review.
- Dashboard visibility must remain private.
- Enable MFA for dashboard administrators.
- Do not generate a public shared link for the dashboard.
- Delete legacy CountAPI data separately if the provider offers deletion; removing the code does not erase historical data.

## Test plan

1. Test production after confirming the exact hostname in Umami Cloud; localhost is intentionally excluded.
2. Verify the notice banner is absent and Umami loads automatically without creating analytics cookies.
3. Disable analytics on the privacy page and verify navigation, external links and animations still work while no events are sent.
4. Accept and test each URL:
   - `/?utm_source=instagram&utm_medium=bio&utm_campaign=test`
   - `/?utm_source=snapchat&utm_medium=story&utm_campaign=test`
   - `/?utm_source=telegram&utm_medium=channel&utm_campaign=test`
   - `/?src=ig`, `/?src=snap`, `/?src=tg`, `/?src=x`
5. Confirm internal navigation retains only allowed campaign parameters.
6. Trigger Come Closer, Telegram and Exclusive once and inspect Network for one request per action.
7. Confirm `/` and `/index.html` both report canonical path `/`.
8. Confirm arbitrary parameters such as `email`, `token` and `code` are absent from event payloads.
9. Set `localStorage.alex_analytics_ignore="true"` and verify no events are sent.
10. Test DNT, ad blocking, back navigation, mobile widths and the 404 page.

## Monthly maintenance

- Review unknown/direct share, campaign naming and broken UTMs.
- Check goal/funnel definitions after link or page changes.
- Review 404s and JavaScript error categories.
- Confirm dashboard access list, MFA and retention.
- Review event volume against the paid plan.
- Export an aggregate report if needed; never commit exports containing sensitive segments.
