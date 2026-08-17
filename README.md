# Scope Card

Draw the line before the work starts.

A static web tool for independent designers, developers, and consultants on fixed-price work. That's Extra is for after the extra ask. Scope Card is for before. Fill what's in and what's out. Get a one-page PDF and a plain-text scope you attach to the proposal.

Price: $19 once. Checkout is not wired yet. The generator works free. Licensed PDFs drop the free-version footer line.

## How to open locally

No build step. No backend.

```bash
cd projects/002-scope-card
python3 -m http.server 8080
```

Then open http://localhost:8080/

Or open `index.html` directly in a browser. PDF download needs the jsPDF CDN, so a local server is more reliable than a `file://` URL.

Unlock a watermark-free PDF for testing:

http://localhost:8080/?license=demo

That sets `localStorage.scopeCardLicense`. Any non-empty value removes the free-version line.

## Files

- `index.html` (marketing + the generator)
- `in-scope-out-of-scope.html` (free in/out of scope template, SEO)
- `statement-of-work-one-pager.html` (one-page SOW template, SEO)
- `styles.css`
- `app.js`

## How to deploy

Upload this folder as static files. Any host works: GitHub Pages, Netlify, Cloudflare Pages, S3, nginx.

Keep the three HTML files at the site root of this project so these paths stay intact:

- `/` or `/index.html`
- `/in-scope-out-of-scope.html`
- `/statement-of-work-one-pager.html`

Suggested public URL slug: `scope-card`

Placeholder public URL: https://latinsushi.github.io/scope-card/

## Where this gets found

SEO pages first. People search "in scope out of scope template", "what's included what's not included freelance", "statement of work one pager", and "one page SOW freelance" while they are writing a proposal.

Communities next. r/freelance, r/webdev, r/graphic_design. Answer the thread with the free lists. Point at the generator for the priced PDF.

Later: a Gumroad listing of the template pack (in/out lists + one-page SOW), with the $19 license as the product.

## Privacy

Nothing typed in the form is uploaded. It stays in the browser.
