## Why

Language learners watching foreign-language YouTube videos often get stuck on unfamiliar words, phrases, or specialized vocabulary — but they lack a systematic way to capture these weak points and verify they've learned them. Current solutions require switching between a video player and separate flashcard tools, breaking immersion. This app integrates the full loop directly: watch real-world videos, identify what you don't understand from user interaction signals (pause, rewind), train with spaced repetition, and re-watch to verify comprehension progress.

## What Changes

- Embed YouTube videos with synchronized transcript playback (using YouTube's built-in captions)
- Track user interactions (pause, rewind, forward) and map them to transcript segments to surface likely comprehension gaps
- Display surrounding sentences of tracked interactions and let users select specific words, phrases, or idioms they couldn't understand
- Persist weak points (words/phrases/idioms) with their video context
- Provide spaced repetition training (flashcards, quizzes) for accumulated weak points
- Implement a re-watch loop: replay the original video and check whether the user still pauses at the same spots — continued pausing means not yet grasped, no pause means learned

## Capabilities

### New Capabilities

- `youtube-player`: Embed YouTube videos with transcript fetching and synchronization via YouTube's built-in captions
- `interaction-tracker`: Capture pause, rewind, and forward events on the video player, map them to corresponding transcript timestamps, and surface nearby sentences as potential comprehension gaps
- `weak-points`: Allow users to select and persist specific words, phrases, or idioms from surfaced sentences, stored with video context and timestamps
- `spaced-repetition`: Generate flashcards and quizzes from weak points, schedule reviews using a spaced repetition algorithm (e.g., SM-2)
- `rewatch-verification`: Re-open previously watched videos, compare new interaction timestamps against saved weak point timestamps, and mark weak points as grasped when the user no longer pauses at the same spot

### Modified Capabilities

<!-- None — this is a greenfield project -->

## Impact

- **New frontend app**: React SPA with embedded YouTube player (YouTube IFrame API), transcript display, weak point selection UI, flashcard/quiz views, and re-watch comparison view
- **New backend service**: Go HTTP server with REST API endpoints for transcript fetching, weak point CRUD, spaced repetition scheduling, and re-watch verification
- **Database**: MySQL for storing weak points, interaction events, and spaced repetition state
- **External dependency**: YouTube Data API v3 or `youtube-dl`/`yt-dlp` for capturing caption data (YouTube IFrame API may not expose raw transcript, so backend-side fetching is needed)
