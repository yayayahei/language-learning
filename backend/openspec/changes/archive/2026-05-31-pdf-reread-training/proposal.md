## Why

Spaced repetition training currently only supports video context — weak points from PDFs show a broken or irrelevant YouTube embed. There's no way to re-read the surrounding text from a PDF during review. Since PDFs are a core part of the app, this gap makes PDF-sourced weak points un-reviewable.

## What Changes

- Training page detects `source_type=pdf` and renders a PDF context viewer instead of the YouTube player
- Clicking "Re-read" navigates to the PDF page at the exact page where the weak point was saved
- PdfPage accepts a `?page=N` query parameter to auto-scroll to a specific page
- Frontend stops sending `video_id` for PDF weak points (uses only `source_id`)

## Capabilities

### New Capabilities

- `pdf-reread`: Training cards for PDF-sourced weak points display a "Re-read context" link that opens the PDF at the correct page, replacing the non-functional YouTube embed.

### Modified Capabilities

None — no existing specs to modify.

## Impact

- **Frontend**: `TrainingPage.tsx` (add PDF context branch), `PdfPage.tsx` (support `page` query param), `SelectionMenu.tsx` (stop sending `video_id` for PDFs)
- **Backend**: No changes — API already supports `source_type=pdf` and `timestamp_ms` stores the page number
- **Dependencies**: None
