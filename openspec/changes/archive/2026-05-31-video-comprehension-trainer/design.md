## Context

Greenfield web app for language learners to improve comprehension by watching YouTube videos. The system embeds YouTube videos, tracks user interactions (pause, rewind, forward) to infer comprehension gaps, lets users save weak points from transcript text, trains via spaced repetition, and verifies learning progress through re-watching.

**Tech Stack**: React (frontend), Go (backend), MySQL (database)
**Constraints**: Single-user initially, no authentication, local-first deployable

## Goals / Non-Goals

**Goals:**
- Embed YouTube videos with synchronized transcript display
- Detect comprehension gaps from playback interaction patterns
- Let users mark words, phrases, and idioms as weak points
- Provide flashcard and quiz-based spaced repetition training
- Support a re-watch loop that verifies whether weak points are grasped

**Non-Goals:**
- Multi-user support or authentication (v1)
- Mobile native apps (web-only, responsive)
- Speech-to-text / generating transcripts (rely on YouTube's built-in captions)
- Social features, leaderboards, or gamification
- Supporting video platforms other than YouTube (v1)

## Decisions

### 1. Transcript fetching via `yt-dlp` (backend-side)

**Decision**: Use `yt-dlp` invoked from the Go backend to extract captions as structured JSON.

**Why**: YouTube's IFrame API does not expose raw transcript text to the browser. `yt-dlp` requires no API key, works across all videos with captions, and outputs timestamped transcript segments in a parseable format. The Go backend wraps it as a subprocess call.

**Alternatives considered**:
- YouTube Data API v3 (`captions.download`) — requires OAuth (not just an API key) for caption downloads, has daily quota limits. Rejected due to auth complexity.
- `youtube-transcript` npm package (client-side) — would expose the fetching mechanism and is more fragile. Server-side is more reliable.

**Trade-off**: `yt-dlp` is a Python dependency that must be installed on the server. Mitigated by documenting it as a prerequisite and checking availability at startup.

### 2. MySQL with `go-sql-driver/mysql`

**Decision**: Use MySQL via `github.com/go-sql-driver/mysql` — the standard MySQL driver for Go.

**Why**: MySQL is widely deployed, well-understood, and has a mature Go driver ecosystem. It supports concurrent connections, which leaves room for multi-user growth. The driver implements `database/sql` interface, making it straightforward to use with standard Go patterns.

**Alternatives considered**:
- SQLite — simpler but not suited for concurrent access if the app grows to multi-user.
- PostgreSQL — equally capable but MySQL was preferred for familiarity and hosting availability.

### 3. YouTube IFrame API for player embedding

**Decision**: Use the YouTube IFrame Player API (`https://www.youtube.com/iframe_api`) in the React frontend.

**Why**: Official API provides `onStateChange` events (playing, paused, buffering) and `getCurrentTime()` for timestamp tracking. It's the standard way to embed and control YouTube videos on the web.

**Alternative considered**: `react-player` npm package — wraps IFrame API but adds abstraction overhead. We'll use the IFrame API directly for finer control over state events.

### 4. SM-2 algorithm for spaced repetition

**Decision**: Implement the SM-2 algorithm in Go. Each weak point has: `easiness_factor` (float, starts at 2.5), `interval` (days), `repetitions` (count), and `next_review` (date).

**Why**: SM-2 is simple, well-documented, and widely used (Anki, Mnemosyne). It requires few parameters and works well for individual learners.

**Algorithm**:
```
if correct:
  repetitions++
  if repetitions == 1: interval = 1
  else if repetitions == 2: interval = 6
  else: interval = round(interval * easiness_factor)
  easiness_factor = max(1.3, easiness_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
else:
  repetitions = 0
  interval = 1
  easiness_factor = max(1.3, easiness_factor - 0.2)
next_review = today + interval days
```

### 5. REST API structure

**Decision**: Single Go HTTP server (`net/http` with `gorilla/mux` or `chi` router) serving a REST JSON API, plus a static file handler for the React build in production.

```
POST   /api/transcripts          — Fetch transcript for a YouTube URL
GET    /api/transcripts/:videoId — Get cached transcript

POST   /api/interactions         — Record a batch of interaction events
GET    /api/interactions/:videoId — Get interactions for a video

GET    /api/weak-points           — List all weak points (with filters)
POST   /api/weak-points           — Create a weak point
DELETE /api/weak-points/:id       — Delete a weak point
POST   /api/weak-points/train     — Send selected weak points to training

GET    /api/training/due          — Get cards due for review today
POST   /api/training/review       — Submit a review result

POST   /api/rewatch/start         — Start a re-watch session
GET    /api/rewatch/summary/:id   — Get re-watch session summary
```

### 6. Frontend component architecture

```
App
├── VideoPage
│   ├── VideoPlayer (YouTube IFrame wrapper)
│   ├── TranscriptPanel (synced text display)
│   └── GapReview (post-watch surfaced sentences)
│       └── WeakPointMarker (text selection + save)
├── WeakPointsPage
│   └── WeakPointList (filterable, searchable)
├── TrainingPage
│   ├── FlashcardView
│   └── QuizView
├── RewatchPage
│   ├── VideoPlayer (with timeline markers)
│   └── RewatchSummary
└── HistoryPage (list of watched videos)
```

### 7. Interaction-to-transcript mapping

When a pause/rewind/forward event fires:
1. Frontend captures `video.currentTime` and event type
2. Frontend finds the nearest transcript segment(s) by timestamp (linear scan or binary search over sorted segments)
3. Events are batched and sent to the backend at session end (or periodically)
4. Backend stores events and returns the surfaced sentence windows for gap review

## Risks / Trade-offs

- **`yt-dlp` dependency**: Requires Python + `yt-dlp` installed. Could break if YouTube changes its caption delivery. → Check availability at startup and show clear setup instructions. Consider YouTube Data API as a fallback path.
- **IFrame API rate limits / blocking**: YouTube may throttle or block embedded players for excessive API calls. → Cache transcripts server-side; debounce seek events.
- **MySQL requires a running server**: Unlike SQLite, MySQL needs a separate server process. → Document setup clearly; consider providing a docker-compose.yml for local development.
- **Caption quality variance**: Auto-generated captions may have errors, and not all videos have captions. → Display a clear warning when auto-generated captions are used. The system still functions — weak points are user-verified.
- **SM-2 requires user honesty**: Self-grading inflates intervals. → This is inherent to self-directed learning; not a technical concern.

## Open Questions

- Should we persist transcripts in the database or re-fetch each time? (Recommend: cache in DB to avoid repeated `yt-dlp` calls)
- Should training quizzes generate distractors from the user's own weak point pool or from a general dictionary? (Recommend: user's own weak point pool for relevance)
- How long after a re-watch should we wait before checking for pauses? Should the user watch the full video or can they skip around?
