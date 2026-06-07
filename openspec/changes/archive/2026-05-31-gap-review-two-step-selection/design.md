## Context

The current GapReview renders transcript segments as a continuous text block where users drag-select text and a popup appears for type tagging. The feedback is: (1) selecting should be a two-step process (mark unclear sentences, then pick specific text), and (2) weak points need video context for replay during training.

## Goals / Non-Goals

**Goals:**
- Step 1: Click entire sentences to mark them as "has something unclear" (toggle on/off)
- Step 2: Only within marked sentences, drag-select specific words/phrases/idioms and tag them
- Weak points include video ID + timestamp for replay context
- Training cards show a mini video player at the weak point's timestamp

**Non-Goals:**
- Extracting actual video clips (uses embedded YouTube player with seek instead)
- Changing the weak-point API (already supports video_id, timestamp_ms, sentence)
- Changing the database schema

## Decisions

### Decision 1: Two-step state machine in GapReview
**Choice**: `step: "mark" | "select"` state with visual divider.
**Rationale**: Simple React state, no routing complexity. Step indicator shows count of marked sentences.

### Decision 2: Sentences clickable, text drag-selectable
**Choice**: Sentences are rendered as `div` blocks (clickable for marking), but with `user-select: text` enabled so native drag-select still works. Step 2 renders only marked sentences as a filtered list where drag-selection triggers the popup.
**Alternative considered**: Custom selection library (overkill — native Selection API works across element boundaries).

### Decision 3: Video context — embedded YouTube IFrame per card
**Choice**: TrainingPage cards render a small YouTube IFrame player (`width=100% height=120`) with `autoplay=0` and `start=<timestamp_seconds>`. User clicks play to hear the context.
**Alternative considered**: Extracting MP3 clips server-side (too complex for now; YouTube IFrame is zero-cost).

### Decision 4: Popup positioning
**Choice**: Fixed-position popup appears at the mouse cursor or selection bounding rect. Dismissed by clicking outside or pressing Escape.

## Risks / Trade-offs

- **Native Selection API is fragile on mobile** → Test on iOS/Android; consider fallback to long-press selection
- **Multiple YouTube IFrames on TrainingPage** → If >10 cards, performance may degrade. Mitigation: lazy-load IFrames only when card is visible (IntersectionObserver)
- **Segment boundaries for drag-select** → If segments are rendered as separate spans with spaces, cross-segment selection works naturally via the browser

## Open Questions

- Should the two-step process be optional? (Users may want to skip directly to selecting text without marking sentences)
- How long should the replay clip play? Currently proposed: 10 seconds from timestamp
