## 1. GapReview Two-Step Flow

- [x] 1.1 Implement `step` state machine in GapReview (`"mark"` → `"select"`)
- [x] 1.2 Render sentences as clickable blocks with toggle highlight in mark step
- [x] 1.3 Filter to only marked sentences in select step, with drag-select + popup
- [x] 1.4 Add step indicator UI (e.g., "Mark unclear sentences (3 marked)" / "Select words/phrases")
- [x] 1.5 Add back/forward navigation between steps
- [x] 1.6 Update CSS for marked sentence highlighting and step transitions

## 2. Weak Point Video Context

- [x] 2.1 Update `POST /api/weak-points` to validate and store video context fields
- [x] 2.2 Add embedded YouTube IFrame player to TrainingPage cards
- [x] 2.3 IFrame seeks to `timestamp_ms` on card reveal
- [x] 2.4 Lazy-load IFrames via IntersectionObserver to avoid performance issues
- [x] 2.5 Handle missing video context gracefully (fallback: text-only card)

## 3. Polish

- [x] 3.1 Test drag-select across segment boundaries
- [x] 3.2 Add Escape key to dismiss selection popup
- [x] 3.3 Add click-outside to dismiss selection popup
- [x] 3.4 Test on mobile viewport
