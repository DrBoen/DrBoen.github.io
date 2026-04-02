# Technical Context

## Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Files in Repo

- `index.html` — page structure and script/style includes
- `styles.css` — layout, branding, form, buttons, modal, and accessibility-related styles
- `app.js` — client behavior, validation, persistence, network requests, export logic
- `vendor/html-docx-js/html-docx.js` — vendored browser bundle used for DOCX creation

## External Dependencies

- Google Fonts: Inter, Merriweather
- `marked` from jsDelivr for Markdown-to-HTML conversion
- `DOMPurify` from jsDelivr for sanitization
- Supabase Edge Function endpoint: `courseforge-generate`

## Runtime Integrations

### Supabase

The frontend posts to a hardcoded Supabase Edge Function URL and uses a hardcoded anon key in request headers. The backend implementation is not present in this repository.

### Browser Storage

`localStorage` key: `cf.form.v1`

### DOCX Export

The app expects `window.htmlDocx.asBlob()` from the vendored browser library. It attempts to ensure the exporter exists before enabling conversion.

## Deployment Model

Likely deployed as a static site on GitHub Pages. The app itself explicitly references:

- `https://drboen.github.io/courseforge`
- `http://127.0.0.1:5500`

This indicates expected usage via static hosting or a local dev server, not direct file preview.

## Technical Constraints and Risks

- No package manifest or build tooling in repo.
- No automated tests.
- No environment-variable separation for public configuration.
- Backend behavior cannot be changed from this repository.
- CORS/origin policy matters for successful generation.
- The vendored DOCX library is large and minified, making direct maintenance harder.

## Notable Implementation Details

- Required fields in code: title, description, CLOs, length, target module count.
- Credit hours is optional but must be a positive whole number when provided.
- DOCX generation sanitizes generated HTML before conversion.
