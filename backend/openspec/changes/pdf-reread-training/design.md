## Context

TrainingPage renders spaced repetition cards. Each card currently shows a `VideoContext` component that embeds a YouTube iframe near the weak point's timestamp. For PDF-sourced weak points, there's no video, so this embed is broken (empty or irrelevant). The `timestamp_ms` field already stores the page number for PDF weak points.

## Goals / Non-Goals

**Goals:**
- Training cards for PDF weak points show a clickable link to re-read the context
- PdfPage accepts a page query param to auto-scroll to the right page
- SelectionMenu stops sending `video_id` for PDFs (clean separation)

**Non-Goals:**
- Wrapping PDF context directly inside the training card (over-engineering; a link to PdfPage is sufficient)
- Backend API changes (the existing API already stores and returns the needed data)
- Changing the weak_points schema

## Decisions

### 1. Link to PdfPage rather than embed PDF

**Why**: Embedding a full PDF renderer in a card is heavy and duplicates PdfViewer. A link to the existing PdfPage with a page query param reuses the same viewer and preserves the user's reading context.

### 2. Use `timestamp_ms` as page number for PDFs

**Why**: The SelectionMenu already sends `timestamp_ms: pageNum` for PDFs. No schema change needed — just read it as a page number when `source_type=pdf`.

### 3. `page` query param in PdfPage

**Why**: Clean REST pattern. `PdfPage` already accepts `pdfId` from the route; adding `?page=N` lets us reuse the existing `initialPage` prop.

## Risks / Trade-offs

- **Page number stored as `timestamp_ms`**: Semantic mismatch, but avoids a schema migration. If a proper page column is added later, this can be migrated.
- **PDF might be deleted**: The link would 404. The card should handle this gracefully (remove or gray out).
