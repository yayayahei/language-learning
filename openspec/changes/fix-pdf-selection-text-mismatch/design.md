## Context

PdfViewer.tsx renders a text layer over PDF pages by creating absolutely-positioned `<span>` elements for each text item returned by `pdfjs.getTextContent()`. Each item represents a word or fragment with its own position and transform. When the browser's `window.getSelection()` concatenates the `textContent` of adjacent spans, it produces a single string with no spaces between words — because the spans contain no inter-word whitespace.

The built-in `pdfjs.TextLayerBuilder` handles this by analyzing horizontal gaps between text items and inserting spaces. The current custom implementation skips this step.

## Goals / Non-Goals

**Goals:**
- Selected text from the PDF viewer includes proper word spacing (matches visual reading)
- Fix applies transparently to clipboard copy, weak points, and precious usages
- Works for left-to-right text with standard word spacing

**Non-Goals:**
- Multi-column layout detection (PDFs with columns may still mis-order text)
- RTL text support
- Rotated text selection improvements
- Fixing text that has already been saved without spaces (no data migration)

## Decisions

### Space insertion via gap analysis between text items on the same line

**How it works:** For each text item, before creating its span, compare its horizontal position to the previous item on the same line. If the gap between the right edge of the previous item and the left edge of the current item exceeds a threshold (30% of the current font size), and neither the previous item's string nor the current item's string already carries whitespace at the boundary, insert a zero-width space span (containing ` `) between them.

**Same-line detection:** Two items are on the same line if their `top` values differ by less than `fontSize * 0.3`. This tolerates minor vertical offsets from font metrics while excluding items on different lines.

**Why not modify item.str directly:** Appending a space to `span.textContent` would change the styling baseline since the space would inherit the font properties of one word. A separate spacer span keeps each word span's content clean and allows independent positioning.

**Why not use pdfjs.TextLayerBuilder:** Adding it would require importing additional pdfjs modules (`pdfjs-display/text_layer_builder` + CSS) and restructuring the render flow. The gap-based fix is ~10 lines and achieves the same result for standard LTR text.

### Threshold value: `fontSize * 0.3`

A typical space in most fonts at 12px is ~3-4px wide, which is ~0.25-0.33 of the font size. Using 0.3 captures standard word spacing while avoiding false positives from kerning gaps or sub-word character offsets. This matches pdfjs's own default `textLayer` spacing logic.

## Risks / Trade-offs

- **False positive spaces**: If a font has unusually wide character spacing, gaps between letters could be misinterpreted as word boundaries, inserting spurious spaces. → The 0.3 threshold is conservative; most fonts keep inter-character gaps well below 0.2 × fontSize.
- **Missing spaces**: Very tight typesetting where word gaps are narrower than 0.3 × fontSize could still produce run-on words. → Rare in practice; this matches pdfjs defaults.
- **Order dependency**: The fix assumes `getTextContent().items` returns items in visual reading order, which is not guaranteed for complex layouts. → This is a pre-existing limitation; the fix doesn't worsen it.
