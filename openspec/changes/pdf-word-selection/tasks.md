## 1. Database Schema

- [x] 1.1 Add `pdf_documents` table to `InitSchema()` in `backend/db/db.go`
- [x] 1.2 Add `precious_usages` table to `InitSchema()` in `backend/db/db.go`
- [x] 1.3 Add migration: `weak_points` — make `video_id` nullable, add `source_type` and `source_id` columns

## 2. Backend: PDF Upload and Serving

- [x] 2.1 Create `backend/handler/pdf.go` with PDF upload endpoint (`POST /api/pdfs`) — validate file type, enforce 20MB limit, save to uploads directory, generate UUID, store metadata
- [x] 2.2 Add PDF list endpoint (`GET /api/pdfs`) and file serving endpoint (`GET /api/pdfs/{id}/file`)
- [x] 2.3 Register PDF handler in `backend/main.go`

## 3. Backend: Precious Usage API

- [x] 3.1 Create `backend/handler/precioususage.go` with create (`POST /api/precious-usages`), list (`GET /api/precious-usages`), and delete (`DELETE /api/precious-usages/{id}`) endpoints
- [x] 3.2 Register precious usage handler in `backend/main.go`

## 4. Frontend: PDF Viewer Component

- [x] 4.1 Install `pdfjs-dist` dependency
- [x] 4.2 Create `frontend/src/components/PdfViewer.tsx` — renders one page at a time on canvas with text layer, page navigation (prev/next/jump), loading and error states
- [x] 4.3 Configure Vite to handle pdfjs-dist worker file

## 5. Frontend: PDF Page

- [x] 5.1 Create `frontend/src/pages/PdfPage.tsx` — PDF list view (all uploaded PDFs), upload form (file input + submit), and PDF reader view (PdfViewer for selected PDF)
- [x] 5.2 Add route `/pdf` and `/pdf/:pdfId` in `App.tsx`

## 6. Frontend: Word Selection and Context Menu

- [x] 6.1 Create `frontend/src/components/SelectionMenu.tsx` — context menu component with "Add to Weak Points" and "Save as Precious Usage" buttons
- [x] 6.2 Create inline type-picker form component (word/phrase/idiom for weak points, word/phrase/expression for precious usage)
- [x] 6.3 Add selection detection (`pointerup` listener) and context menu positioning logic in `PdfViewer.tsx`
- [x] 6.4 Wire save actions to API calls (`POST /api/weak-points` and `POST /api/precious-usages`)

## 7. Frontend: Precious Usage Page

- [x] 7.1 Create `frontend/src/pages/PreciousUsagePage.tsx` — list entries with type filter, search, and delete
- [x] 7.2 Add route `/precious-usages` in `App.tsx`

## 8. Navigation and Integration

- [x] 8.1 Add "PDF" and "Precious Usage" nav links in `App.tsx`
- [ ] 8.2 End-to-end smoke test: upload PDF, view pages, select text, save to weak points, save to precious usage, view both lists
