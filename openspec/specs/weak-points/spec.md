# weak-points Specification

## Purpose
TBD - created by archiving change gap-review-two-step-selection. Update Purpose after archive.
## Requirements
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

### Requirement: Select words as weak points
The system SHALL allow users to highlight text within surfaced transcript sentences and save individual words as weak points.

#### Scenario: User selects a word
- **WHEN** user highlights a word in a surfaced sentence and clicks "Add as weak point"
- **THEN** the word is saved with its video context (video ID, timestamp, surrounding sentence)

#### Scenario: User selects a phrase
- **WHEN** user highlights a multi-word phrase and clicks "Add as weak point"
- **THEN** the phrase is saved as a single weak point with video context

### Requirement: Select idioms as weak points
The system SHALL allow users to flag entire sentences or multi-word expressions as idiom weak points, distinguishing them from regular word/phrase weak points.

#### Scenario: User marks an idiom
- **WHEN** user selects a sentence or expression and marks it as an idiom
- **THEN** the idiom is saved with a type flag differentiating it from regular words/phrases

### Requirement: View weak points list
The system SHALL display all saved weak points in a searchable, filterable list.

#### Scenario: Browse all weak points
- **WHEN** user navigates to the weak points view
- **THEN** all saved weak points are displayed with their type (word/phrase/idiom), video context, and creation date

#### Scenario: Filter by type
- **WHEN** user filters weak points by type (word, phrase, or idiom)
- **THEN** only matching weak points are displayed

#### Scenario: Search weak points
- **WHEN** user types a search query in the weak points list
- **THEN** only weak points whose text matches the query are displayed

### Requirement: Delete weak points
The system SHALL allow users to delete weak points they no longer need.

#### Scenario: User deletes a weak point
- **WHEN** user clicks delete on a weak point
- **THEN** the system prompts for confirmation and removes it from the list upon confirmation

### Requirement: Export weak point to training
The system SHALL allow users to select weak points to add to the spaced repetition training queue.

#### Scenario: User sends weak points to training
- **WHEN** user selects one or more weak points and clicks "Train these"
- **THEN** the selected weak points are added to the spaced repetition deck

