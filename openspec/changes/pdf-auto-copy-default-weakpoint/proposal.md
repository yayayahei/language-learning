## Why

When reading PDFs, selecting text to save as a weak point requires two clicks through the popup menu and the selected text is not copied to the clipboard. These extra steps interrupt the reading flow and add friction to the most common action (adding weak points).

## What Changes

- Selected PDF text is automatically copied to the clipboard on selection
- The two-step popup (action selection → type selection) is replaced by a direct weak point type selection, eliminating the intermediate "Add to Weak Points / Save as Precious Usage" choice

## Capabilities

### New Capabilities
- `pdf-selection-shortcut`: When text is selected in the PDF viewer, it is automatically copied to the clipboard, and the selection popup defaults directly to weak point type selection instead of showing the action choice screen.

### Modified Capabilities
<!-- None — existing spec-level behavior is unchanged -->

## Impact

- `frontend/src/pages/PdfPage.tsx` — add clipboard copy in `handleSelection`
- `frontend/src/components/SelectionMenu.tsx` — change default `action` state to `'weak-point'` to skip action selection step
