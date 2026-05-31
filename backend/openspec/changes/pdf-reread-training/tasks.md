## 1. Fix SelectionMenu

- [x] 1.1 Remove `video_id` from the request body when `source_type=pdf`

## 2. PdfPage query param

- [x] 2.1 Accept `?page=N` query parameter in PdfPage and pass it as `initialPage` to PdfViewer

## 3. TrainingPage PDF context

- [x] 3.1 Check `source_type` on each training card; if `pdf`, render a "Re-read (page N)" link pointing to `/pdf/<source_id>?page=<timestamp_ms>`
- [x] 3.2 Keep existing `VideoContext` component for `source_type=video` cards

## 4. Verification

- [x] 4.1 Create a weak point from a PDF, verify `video_id` is not in the request
- [x] 4.2 Open a PDF with `?page=5`, verify it scrolls to page 5
- [x] 4.3 Go to training page with a PDF weak point, verify "Re-read" link appears and navigates correctly
