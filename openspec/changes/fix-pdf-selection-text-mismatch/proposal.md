## Why

When users select text in the PDF viewer, the extracted text concatenates adjacent words without spaces (e.g., "Thequickbrownfox" instead of "The quick brown fox"). This corrupts clipboard copies, weak point entries, and precious usage entries — making the selection feature unreliable for language learning.

## What Changes

- Fix PDF text layer rendering to insert spaces between adjacent word spans when the original text items lack trailing whitespace
- The fix applies at the selection extraction level, so clipboard copy, weak point save, and precious usage save all receive correctly spaced text
- No API or database changes required

## Capabilities

### New Capabilities

- `pdf-text-selection`: PDF text selection produces readable text with proper word spacing

### Modified Capabilities

None — existing specs define what weak points and precious usages store, not how the text is extracted.

## Impact

- **Affected code**: `frontend/src/components/PdfViewer.tsx` (text layer rendering loop, lines 145-169)
- **Affected flows**: PDF text selection → clipboard, weak points, precious usages
- **No API changes**, no database changes, no dependency changes
