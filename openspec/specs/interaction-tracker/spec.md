# interaction-tracker Specification

## Purpose
TBD - created by archiving change video-comprehension-trainer. Update Purpose after archive.
## Requirements
### Requirement: Track pause events
The system SHALL detect when the user pauses the video and record the timestamp, mapping it to the nearest transcript segment.

#### Scenario: User pauses during playback
- **WHEN** user presses pause
- **THEN** the system records the pause timestamp and identifies the transcript segment(s) matching that time window

#### Scenario: Rapid pause-unpause
- **WHEN** user pauses and immediately resumes (within 1 second)
- **THEN** the system ignores the event as accidental

### Requirement: Track rewind events
The system SHALL detect when the user rewinds (seeks backward) and record the start and end timestamps, mapping them to the corresponding transcript segments.

#### Scenario: User rewinds
- **WHEN** user seeks backward by any amount
- **THEN** the system records the rewind source timestamp, the destination timestamp, and identifies transcript segments in the replayed range

#### Scenario: Small rewind threshold
- **WHEN** user seeks backward by less than 2 seconds
- **THEN** the system treats it as a rewind event but marks it as a minor correction (not a comprehension gap)

### Requirement: Track forward events
The system SHALL detect when the user fast-forwards (seeks forward) and record the skipped range, mapping it to transcript segments.

#### Scenario: User fast-forwards
- **WHEN** user seeks forward by any amount
- **THEN** the system records the skipped range and identifies transcript segments that were skipped

### Requirement: Surface potential comprehension gaps
The system SHALL aggregate interaction events and surface the surrounding transcript sentences as potential comprehension gaps for the user to review.

#### Scenario: Interaction cluster identified
- **WHEN** multiple interaction events (pause, rewind, forward) occur within a 10-second window
- **THEN** the system groups them and surfaces all transcript sentences within that window for review

#### Scenario: Single pause surfaces nearby text
- **WHEN** a single deliberate pause is detected (not accidental)
- **THEN** the system surfaces the 2 transcript sentences before and 1 sentence after the pause point

