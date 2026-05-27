## ADDED Requirements

### Requirement: Weak points reference video context
Each weak point SHALL store the video ID and timestamp (in milliseconds) of the original video where the word/phrase/idiom appeared, enabling users to replay the exact moment during training review.

#### Scenario: Save weak point with video context
- **WHEN** a weak point is created from the GapReview
- **THEN** the API stores `video_id`, `timestamp_ms`, and the full `sentence` alongside the selected text and type

#### Scenario: Replay context during training
- **WHEN** a user reviews a weak point in the TrainingPage
- **THEN** the card displays a "Replay" button that seeks the video to the saved timestamp

### Requirement: Video clip playback on weak point cards
The TrainingPage SHALL display a short video clip player embedded in weak point cards, starting from the saved timestamp, so the user can hear the original pronunciation and usage context.

#### Scenario: Embedded clip player
- **WHEN** a weak point card is shown during training
- **THEN** an embedded YouTube player loads at the saved timestamp and plays approximately 10 seconds

#### Scenario: No clip available
- **WHEN** the video ID is missing or the video is unavailable
- **THEN** the card falls back to showing only the text and sentence context without a player
