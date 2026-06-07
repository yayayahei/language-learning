## Context

Currently, selecting text in the PDF viewer opens a two-step popup: first choose an action ("Add to Weak Points" or "Save as Precious Usage"), then choose the type and save. The selected text is not copied to the clipboard. This adds unnecessary friction since the vast majority of selections are intended for weak points.

## Goals / Non-Goals

**Goals:**
- Automatically copy selected PDF text to the system clipboard
- Skip the action selection step and default directly to weak point type selection

**Non-Goals:**
- Removing the "Save as Precious Usage" path entirely (it can be revisited later if needed)
- Changing the video-based GapReview selection flow

## Decisions

**Decision 1: Copy to clipboard in `PdfPage.handleSelection`**

The clipboard write (`navigator.clipboard.writeText`) goes in `PdfPage.tsx`'s `handleSelection` callback, right after `setSelection` is called. This is the cleanest place — it's the single entry point for all PDF selections, regardless of what the user does next.

**Decision 2: Default `action` to `'weak-point'` instead of `null`**

In `SelectionMenu.tsx`, changing the initial `action` state from `null` to `'weak-point'` causes the component to render the weak point type selection view directly, skipping the action choice screen. The component is only used in PDF context (`PdfPage.tsx`), so this doesn't affect the video GapReview flow.

## Risks / Trade-offs

- **Clipboard API requires a secure context (HTTPS/localhost)** — All development and deployment already runs over HTTPS/localhost, so this is not a concern.
- **Users lose one-click access to "Save as Precious Usage"** — The majority of selections are for weak points. The precious usage path can be re-added later with a secondary action if users request it.
