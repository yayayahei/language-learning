## ADDED Requirements

### Requirement: Weak point schema with video context
The weak_points table SHALL store `video_id` (references videos.id), `timestamp_ms` (position in the video), and `sentence` (the full transcript segment containing the weak point) alongside the selected text and type.

#### Scenario: Create weak point with context
- **WHEN** a weak point is saved via `POST /api/weak-points`
- **THEN** the request body MUST include `video_id`, `timestamp_ms`, and `sentence` fields

#### Scenario: List weak points with context
- **WHEN** weak points are fetched via `GET /api/weak-points`
- **THEN** each item includes `video_id`, `timestamp_ms`, and `sentence` for replay context

### Requirement: TrainingPage video replay
The TrainingPage SHALL display video context for each weak point card, with a replay control that seeks the embedded YouTube player to the saved timestamp.

#### Scenario: Replay from training card
- **WHEN** the user clicks "Replay" on a training card
- **THEN** an embedded player seeks to `timestamp_ms` and plays the surrounding context
