# System Patterns

## Architecture Style

CourseForge uses a simple static frontend architecture:

- `index.html` defines the full UI structure.
- `styles.css` defines branding, layout, states, and modal styling.
- `app.js` owns all behavior through direct DOM querying and event listeners.

There is no component framework, module bundler, or server code in this repository.

## Main Runtime Pattern

1. Cache DOM references at startup.
2. Restore saved form state from `localStorage`.
3. Attach validation, autosave, autoresize, and modal event handlers.
4. On submit, validate and construct a compact `courseInfo` payload.
5. Send payload to Supabase Edge Function.
6. On success, store `latestMarkdown` in memory and expose download actions.

## Key Frontend Patterns

### DOM-Centric State Management

State is handled with:

- Input element values
- A few in-memory variables (`latestMarkdown`, timer state, modal focus state)
- Browser `localStorage` for persistence

### Validation Pattern

- Required-field validation happens in `validateClient()`.
- Numeric enforcement uses a strict positive integer regex.
- Numeric fields also receive live inline validation on `input` and `blur`.

### Async Request Pattern

- `postGenerate()` performs a `fetch()` POST with JSON body.
- Supabase headers include `Authorization`, `apikey`, and `x-client-info`.
- Errors are normalized by HTTP status to user-facing messages.

### Busy/Status Pattern

- `setBusy()` disables submit, adds spinner text, sets `aria-busy`, and starts an elapsed timer.
- `showError()` / `showSuccess()` update a shared status region and move focus there.

### Export Pattern

- Markdown download uses a Blob and temporary anchor.
- DOCX export converts Markdown → HTML via `marked`, sanitizes via `DOMPurify`, then converts HTML → DOCX via vendored `html-docx-js`.

### Persistence Pattern

- `collectFormValues()` serializes the full form.
- `saveFormToStorage()` runs on input and blur.
- `restoreFormFromStorage()` hydrates the UI on load.

### Modal Pattern

- Reset is gated behind a modal with:
  - explicit open/close functions
  - focus restoration
  - Escape-to-close behavior
  - basic Tab focus trapping

## Important Design Decisions

- Optional fields are omitted from the payload when empty.
- Integers are parsed before sending to the backend.
- Output is not rendered directly in-page; instead, the app offers download actions after generation.
- Sanitization is applied before DOCX conversion, reducing export-time HTML risk.
