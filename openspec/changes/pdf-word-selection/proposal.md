## Why

The app currently only supports video-based learning, but many learners also study from PDF documents (articles, books, papers). Users need the ability to read embedded PDFs, select unfamiliar words or useful expressions, and save them to their weak points or a "precious usage" collection for later review — the same workflow they already use with video transcripts.

## What Changes

- Add a PDF reader page that can display embedded PDF files in the browser
- Enable word/text selection within the rendered PDF via pointer/mouse interaction
- Show a context menu on text selection with two actions: "Add to Weak Points" and "Save as Precious Usage"
- Introduce a "Precious Usage" collection — a saved list of phrases/expressions the user wants to remember and reuse, distinct from weak points (which are for practice/review)
- Support uploading or loading PDF files into the app
- Add a navigation entry for the PDF reader page and the precious usage list

## Capabilities

### New Capabilities
- `pdf-viewer`: Render and navigate embedded PDF files in the browser with page controls
- `word-selection`: Select text in the PDF viewer and trigger a context menu with save actions
- `precious-usage`: A new collection type for saving useful phrases/expressions the user wants to keep, with a dedicated list page

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Frontend**: New PDF reader page, new precious usage list page, new React components (PDF viewer, context menu), new route, navigation update
- **Backend**: New API endpoints for precious usage CRUD (similar to existing weak points API), PDF file serving
- **Dependencies**: PDF rendering library (e.g., `react-pdf` or `pdfjs-dist`), text selection handling
- **Database**: New table for precious usage entries (similar schema to weak points)
