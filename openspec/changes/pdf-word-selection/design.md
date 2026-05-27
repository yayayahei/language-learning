## Context

The app is a language-learning tool with a React frontend and Go (chi) backend using MySQL. It currently supports video-based learning: users watch videos with transcripts, mark weak points from transcript text, and train on them via spaced repetition. There is no support for text-based or PDF-based learning.

This design adds PDF document reading with the same word-saving workflow. Users upload a PDF, read it in-app, select words/expressions, and save them to weak points or a new "precious usage" collection.

## Goals / Non-Goals

**Goals:**
- Render uploaded PDF files in-browser with page navigation
- Allow text selection in the PDF and show a context menu with save actions
- Save selected text as a weak point (integrated with existing training flow)
- Save selected text as "precious usage" (a simpler, non-training collection)
- Upload PDF files from the frontend to the backend
- List and manage precious usage entries

**Non-Goals:**
- PDF annotation or highlighting (read-only viewing beyond text selection)
- External PDF URLs (upload only)
- OCR / scanned PDF support (text-layer PDFs only)
- Modifying the existing weak points training algorithm

## Decisions

### 1. PDF Rendering: `pdfjs-dist` directly (not `react-pdf`)

`react-pdf` is a React wrapper that abstracts away text layer rendering, making custom text selection handling harder. Using `pdfjs-dist` directly gives us:
- Full control over the text layer DOM for selection detection
- Ability to render pages one-at-a-time with custom controls
- Lighter bundle (we only import what we need)

The PDF viewer component will:
- Load the PDF via `pdfjs-dist`'s `getDocument()`
- Render one page at a time onto a `<canvas>`, with an overlaid transparent text layer for native text selection
- Provide prev/next page controls and a page number display

### 2. PDF Storage: Filesystem + metadata table

PDF files are stored on disk under an `uploads/` directory. Metadata goes in a new `pdf_documents` table.

```sql
CREATE TABLE pdf_documents (
    id VARCHAR(36) PRIMARY KEY,      -- UUID
    filename VARCHAR(512) NOT NULL,   -- original filename
    title VARCHAR(512) DEFAULT '',    -- user-friendly title
    file_path VARCHAR(1024) NOT NULL, -- server filesystem path
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

The backend serves PDF files via a `/api/pdfs/{id}/file` endpoint that streams the file. The `uploads/` directory is configurable via an environment variable (`UPLOAD_DIR`), defaulting to `./uploads`.

### 3. Weak Points Schema: Add source_type + source_id, make video_id nullable

To allow weak points from both videos and PDFs, the `weak_points` table is extended:

```sql
ALTER TABLE weak_points
  MODIFY video_id VARCHAR(32) NULL,
  ADD COLUMN source_type ENUM('video', 'pdf') DEFAULT 'video',
  ADD COLUMN source_id VARCHAR(36) DEFAULT '';
```

Existing rows default to `source_type='video'` and `source_id=''`. Video-sourced weak points still use `video_id`; PDF-sourced weak points set `video_id=NULL`, `source_type='pdf'`, and `source_id` to the PDF's UUID.

### 4. Precious Usage: Separate table, no training integration

Precious usage is a flat collection — no spaced repetition, no training state. It's a scrapbook of useful expressions.

```sql
CREATE TABLE precious_usages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(1024) NOT NULL,
    pu_type ENUM('word', 'phrase', 'expression') NOT NULL,
    source_type ENUM('video', 'pdf') NOT NULL,
    source_id VARCHAR(36) NOT NULL,
    sentence TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source (source_type, source_id)
);
```

### 5. Text Selection + Context Menu

The PDF text layer renders each character as a `<span>`. When the user selects text with the pointer and releases, we:
1. Listen to the `pointerup` event on the text layer
2. Read `window.getSelection().toString()` to get the selected text
3. If non-empty, show a custom context menu at the pointer position with two buttons: "Add to Weak Points" and "Save as Precious Usage"
4. If "Add to Weak Points" is chosen, show a quick inline form to pick type (word/phrase/idiom) before saving
5. If "Save as Precious Usage" is chosen, show a quick inline form to pick type (word/phrase/expression) before saving

## Risks / Trade-offs

- **Large PDFs (>50MB)**: Loading large PDFs could cause browser memory issues. Mitigation: set a reasonable upload size limit (20MB) on the backend.
- **Non-English PDFs with RTL text**: pdfjs supports RTL, but our text selection assumes LTR. Mitigation: scope to LTR languages initially; RTL support can be added later.
- **pdfjs-dist worker setup**: Requires a worker file to be copied or served from CDN. Mitigation: configure Vite to copy the worker file during build, or use the official CDN for the worker.
- **Concurrent schema migration**: The weak_points migration (making video_id nullable) could fail if foreign keys reference missing videos. Mitigation: the existing data should be valid; test migration against a copy of production data before deploying.
