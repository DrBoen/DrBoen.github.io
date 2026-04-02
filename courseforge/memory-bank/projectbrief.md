# CourseForge Project Brief

## Project Overview

CourseForge is a lightweight single-page web application that helps instructors draft a course map from structured course-design inputs. Users provide required course metadata and optional planning details, then the app sends that information to a hosted Supabase Edge Function which returns generated Markdown.

## Primary Goal

Reduce the effort needed to create a first-pass course map by turning instructor inputs into a downloadable AI-generated draft.

## Core User Flow

1. User opens the static web app.
2. User fills out required and optional course-planning fields.
3. Client-side validation checks required fields and integer inputs.
4. App posts the payload to a Supabase Edge Function.
5. Returned Markdown becomes available for download as Markdown or DOCX.

## Current Scope in Repository

- Static frontend only.
- No local backend or build pipeline.
- One vendored browser DOCX conversion library.
- Runtime dependency on external CDNs and a Supabase Edge Function.

## Important Constraints

- Generation only works when served over an allowed HTTP(S) origin, not `file://`.
- The generator backend is external to this repo.
- The app depends on a hardcoded Supabase function URL and anon key.

## Success Criteria

- Collect course information clearly.
- Validate required input before submission.
- Return a downloadable course map with minimal friction.
- Preserve in-progress form data locally so users do not lose work.
