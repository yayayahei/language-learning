## Why

The current GapReview forces users to drag-select text in a single pass, but choosing what you don't understand is a two-step thought process: first identify the problematic sentences, then pinpoint the specific word/phrase/idiom within them. Additionally, weak points currently save only text — when reviewing later, there's no way to replay the original audio context to hear pronunciation and usage.

## What Changes

- **Two-step GapReview flow**: Step 1 — click sentences that contain comprehension gaps. Step 2 — within selected sentences, drag-select the specific word, phrase, or idiom and pick its type
- **Video context on weak points**: Each weak point stores the video ID, timestamp, and a short audio/video clip reference so users can replay the exact moment during training or review
- **Clip extraction** (optional, future): Extract short video clips at weak point timestamps for flashcard/training replay

## Capabilities

### New Capabilities
- `two-step-gap-review`: Sentence-level marking followed by word/phrase/idiom selection within marked sentences, with type tagging
- `weak-point-video-context`: Weak points linked to video ID and timestamp, enabling replay of the original moment during training review

### Modified Capabilities
- `weak-points`: Weak point schema gains video context fields (video_id, timestamp_ms, sentence) — already partially present but must be surfaced in training review UI

## Impact

- **Frontend**: GapReview component rewritten with two-step state machine; TrainingPage cards show video context and replay button
- **Backend**: Weak point API already stores video context — no schema change needed; add clip extraction endpoint (future)
- **Database**: `weak_points` table already has `video_id` and `timestamp_ms` columns — no migration needed
