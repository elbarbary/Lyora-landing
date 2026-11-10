# lyora.beauty

Static site served by GitHub Pages from `main` (custom domain in `CNAME`).
Anything pushed to `main` is live within a minute or two.

## Pages
| Path | What |
|---|---|
| `/` | English landing page |
| `/ar/` | Arabic landing page (RTL) |
| `/privacy.html`, `/ar/privacy.html` | Privacy policy (legal text — change only with counsel) |
| `/en/`, `/en/privacy.html` | Redirects to the canonical English pages |
| `404.html` | Not-found page |

## Design
- One stylesheet: `assets/site.css` — tokens at the top mirror the app
  (`lib/core/constants/app_colors.dart`): rose `#C8336B`, ink `#1A1A1A`.
- Fonts are self-hosted (`assets/fonts`, SIL OFL): Cormorant Garamond + DM Sans
  for English, Noto Naskh Arabic + IBM Plex Sans Arabic for Arabic. No requests
  to Google or any third party except the Android-waitlist Google Form.
- App screens in `assets/screens` are real screenshots of the current app
  (WebP, 600 px + 360 px). Replace them by regenerating from the app's widget
  tests and converting to WebP at the same names.
- `assets/site.js`: sticky header, mobile menu, gentle scroll reveal (off for
  reduced motion), waitlist form status. No trackers.

## Booking links
Artists' links live on `book.lyora.beauty/<handle>` (Firebase Hosting, in the
app repo under `hosting/`). Once that subdomain is live, set
`BOOK_LINKS_LIVE = true` in `404.html` so `lyora.beauty/<handle>` forwards to it.

## Rollback
The previous site is preserved on the `legacy-site` branch.
