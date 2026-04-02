# Product Context

## Why This Exists

Designing a course map can be time-consuming, especially when an instructor has partial information and needs help organizing outcomes, pacing, and module structure. CourseForge lowers the barrier to producing a useful draft.

## User Problem

Users need a fast way to transform course details into a structured course map without manually drafting everything from scratch.

## Intended Users

- Instructors
- Course designers
- Faculty planning new or revised courses

## User Experience Goals

- Fast, low-friction single-page workflow
- Clear indication of what is required vs optional
- Friendly academic branding
- Good defaults while still benefiting from richer inputs
- Safe recovery from refreshes or accidental navigation through autosave
- Straightforward output download in common formats

## Product Behavior

The app accepts a core set of required inputs:

- Course title
- Course description
- Course-level outcomes
- Course length
- Target module count

It also accepts several optional design inputs such as PLOs, credit hours, key topics, assessments, and learner characteristics. These are used to shape generation quality but are not required for submission.

## Output Promise

The product promises a generated draft course map, returned as Markdown and optionally exported to DOCX in-browser.

## Current UX Observations

- The page is optimized around a single long form.
- Success and failure states are surfaced in a status region.
- Resetting the form is protected by a confirmation modal.
- There is a small mismatch between an HTML comment and actual validation rules: more fields are required than the comment suggests.
