# Milne Masonry — milnemasonry.com

A single-page marketing site hosted on Cloudflare Pages. Pushing to `main`
redeploys automatically.

## Files

| Path                  | What it is                                              |
| --------------------- | ------------------------------------------------------- |
| `index.html`          | The entire site — markup, custom CSS, and scripts        |
| `styles.css`          | **Generated.** Tailwind output — do not edit by hand     |
| `src/input.css`       | Tailwind entry point (rarely changes)                    |
| `tailwind.config.js`  | Brand colors and fonts                                   |
| `404.html`            | Served for unknown URLs                                  |
| `functions/contact.js`| Cloudflare Pages Function behind the contact form        |
| `photos/`             | Project photography                                      |
| `sitemap.xml`         | Update `lastmod` when the page content changes           |

## Important: the CSS is prebuilt

`styles.css` is generated from the class names found in `index.html`. **If you
add, remove, or change any class name in `index.html`, you must regenerate it**
or the new classes will have no styling on the live site:

```bash
npm install      # first time only
npm run build:css
```

Then commit both `index.html` and `styles.css` together.

While editing, `npm run watch:css` rebuilds automatically on every save.

Colors and fonts are defined in `tailwind.config.js`, not in `index.html`.

## Contact form

The form posts to `/contact`, handled by `functions/contact.js`, which sends two
emails through Resend: a notification to ryan@milnemasonry.com and a
confirmation to the visitor.

It requires one environment variable, set in the Cloudflare Pages dashboard:

- `RESEND_API_KEY`

Abuse protections in the function:

- Submissions are only accepted from `milnemasonry.com` origins
- A hidden honeypot field (`website`) silently drops bot submissions
- Five submissions per IP per hour, tracked in the edge cache
- All visitor input is HTML-escaped before it goes into an email
- The visitor confirmation only sends after the notification succeeds

To check on it: Cloudflare dashboard → Pages → this project → Functions → logs.
