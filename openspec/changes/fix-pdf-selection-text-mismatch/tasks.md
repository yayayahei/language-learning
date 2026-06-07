## 1. Fix text layer spacing

- [x] 1.1 Add same-line and gap detection logic to the text layer rendering loop in `PdfViewer.tsx` — track previous item position, detect same-line via `top` proximity (within `fontSize * 0.3`), and compute horizontal gap between previous right edge and current left edge
- [x] 1.2 Insert a spacer `<span>` containing ` ` between word spans when gap exceeds `fontSize * 0.3` and boundary items lack their own whitespace

## 2. Verify

- [ ] 2.1 Manually test PDF text selection with a document containing standard word spacing — verify clipboard copy and weak point save produce correctly spaced text
- [ ] 2.2 Verify single-word selection is unaffected (no extra padding or spaces)
