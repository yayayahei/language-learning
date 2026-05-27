## 1. Project Setup

- [x] 1.1 Initialize Go module with `chi` router and `go-sql-driver/mysql`
- [x] 1.2 Initialize React app with TypeScript and React Router
- [x] 1.3 Create MySQL schema (videos, transcripts, interactions, weak_points, training_state, rewatch_sessions tables)
- [x] 1.4 Create docker-compose.yml with MySQL service
- [x] 1.5 Add Go backend health-check endpoint and React dev proxy config

## 2. YouTube Transcript Fetching

- [x] 2.1 Implement `yt-dlp` subprocess wrapper in Go to extract captions as JSON
- [x] 2.2 Parse `yt-dlp` output into structured transcript segments (text, start_ms, end_ms)
- [x] 2.3 Implement `POST /api/transcripts` endpoint — accepts YouTube URL, returns transcript or error
- [x] 2.4 Implement `GET /api/transcripts/:videoId` — returns cached transcript from DB
- [x] 2.5 Cache fetched transcripts in MySQL to avoid repeated `yt-dlp` calls

## 3. YouTube Player & Transcript Sync

- [x] 3.1 Build VideoPlayer component wrapping YouTube IFrame API
- [x] 3.2 Build TranscriptPanel component with scrollable timestamped segments
- [x] 3.3 Implement transcript auto-scroll to highlight current segment during playback
- [x] 3.4 Implement click-to-seek: clicking a transcript segment seeks the video
- [x] 3.5 Build VideoPage combining VideoPlayer + TranscriptPanel with URL input

## 4. Interaction Tracking

- [x] 4.1 Capture pause, rewind, and forward events from YouTube IFrame API state changes
- [x] 4.2 Implement debounce logic: ignore rapid pause-unpause (<1s) and sub-2s rewinds
- [x] 4.3 Map interaction timestamps to nearest transcript segments in frontend
- [x] 4.4 Implement `POST /api/interactions` — batch-store interaction events in MySQL
- [x] 4.5 Implement `GET /api/interactions/:videoId` — retrieve interaction history for a video
- [x] 4.6 Build GapReview component — surfaces transcript sentences around interaction clusters for post-watch review

## 5. Weak Points

- [x] 5.1 Build WeakPointMarker — text selection in surfaced sentences with "word/phrase/idiom" type picker
- [x] 5.2 Implement `POST /api/weak-points` — create weak point with text, type, video context, timestamp
- [x] 5.3 Implement `GET /api/weak-points` — list with search and type filter
- [x] 5.4 Implement `DELETE /api/weak-points/:id` — remove a weak point
- [x] 5.5 Implement `POST /api/weak-points/train` — move selected weak points into training deck
- [x] 5.6 Build WeakPointsPage with searchable, filterable WeakPointList

## 6. Spaced Repetition Training

- [x] 6.1 Implement SM-2 algorithm in Go (easiness factor, interval, next review date)
- [x] 6.2 Implement `GET /api/training/due` — return weak points due for review today
- [x] 6.3 Implement `POST /api/training/review` — accept review result (correct/incorrect), update SM-2 state
- [x] 6.4 Build FlashcardView — front side (weak point text) → tap → back side (sentence with blank)
- [x] 6.5 Build QuizView — fill-in-the-blank with 4 choices (3 distractors from user's own weak point pool)
- [x] 6.6 Build TrainingPage with mode toggle (flashcards vs quiz) and session summary

## 7. Re-watch Verification

- [x] 7.1 Build HistoryPage listing previously watched videos
- [x] 7.2 Extend VideoPlayer to show timeline markers at saved weak point timestamps
- [x] 7.3 Implement re-watch interaction tracking with weak point proximity matching (3s threshold)
- [x] 7.4 Build RewatchSummary — passed count, still-struggling count, new weak points, progress indicator
- [x] 7.5 Implement "mark as grasped" — update weak point status on user confirmation
- [x] 7.6 Implement `POST /api/rewatch/start` and `GET /api/rewatch/summary/:id` endpoints

## 8. Integration & Polish

- [x] 8.1 Wire full flow: watch → gap review → mark weak points → train → rewatch → verify
- [x] 8.2 Add responsive layout for mobile/tablet
- [x] 8.3 Add error handling for videos without captions, network failures, and `yt-dlp` unavailable
- [x] 8.4 Serve React build as static files from Go server for production
