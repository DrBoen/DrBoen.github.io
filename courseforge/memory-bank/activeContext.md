# Active Context

## Current Focus

Initial repository research and creation of the Memory Bank for CourseForge.

## What Was Learned

- The app is a static, single-page course-map generator frontend.
- It relies on an external Supabase Edge Function to generate Markdown.
- The repository contains only frontend assets plus one vendored DOCX library.
- Form state is autosaved locally and restored on load.
- Output is downloadable as Markdown or DOCX, not displayed inline.

## Current Important Details

- Required fields are broader than one outdated HTML comment suggests.
- Accessibility considerations are present: live status region, focus management, modal keyboard support, `aria-busy`, and reduced-motion handling for the spinner.
- The app handles a narrow set of known backend/network error cases with custom messages.

## Open Questions / Gaps

- Exact response contract of the Supabase function beyond `{ markdown }` is not documented here.
- No backend prompt logic or generation strategy is available in this repo.
- No explicit tests or QA scripts exist to validate the browser flow automatically.

## Suggested Next Steps

- If future work is requested, verify the deployed flow against the real Supabase backend.
- Consider documenting the backend API contract separately if it becomes available.
- Consider reconciling outdated comments with actual validation behavior.

## Recent Actions

- Inspected all repository files.
- Used subagents to research JavaScript behavior, UI structure, and project-level architecture.
- Created the initial Memory Bank core documents.
