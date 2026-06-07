## 1. Implementation

- [x] 1.1 Add clipboard copy in `PdfPage.tsx` `handleSelection` — call `navigator.clipboard.writeText(text)` after `setSelection`
- [x] 1.2 Default to weak point type in `SelectionMenu.tsx` — change initial `action` state from `null` to `'weak-point'`, removing unused action selection UI
