## ADDED Requirements

### Requirement: Embed YouTube video
The system SHALL embed a YouTube video via the YouTube IFrame API and provide play, pause, seek, and volume controls.

#### Scenario: Load video by URL
- **WHEN** user provides a valid YouTube URL
- **THEN** the video player loads and displays the video with standard controls

#### Scenario: Invalid URL handling
- **WHEN** user provides an invalid or unsupported YouTube URL
- **THEN** the system displays an error message indicating the URL is not valid

### Requirement: Fetch and display transcripts
The system SHALL fetch the transcript (captions/subtitles) for a loaded YouTube video and display it synchronized with playback.

#### Scenario: Transcript available
- **WHEN** a video loads and has built-in captions available
- **THEN** the system fetches the transcript and displays it as a scrollable list of timestamped text segments

#### Scenario: Transcript unavailable
- **WHEN** a video loads and has no built-in captions
- **THEN** the system displays a message indicating no transcript is available for this video, and the pipe continues without it

#### Scenario: Transcript auto-scroll
- **WHEN** the video plays and reaches a transcript segment's timestamp
- **THEN** the transcript view auto-scrolls to highlight the current segment

#### Scenario: User selects transcript language
- **WHEN** the video has captions in multiple languages
- **THEN** the user can select their target language from the available options

### Requirement: Click-to-seek transcript
The system SHALL allow users to click on any transcript segment to seek the video to that segment's start time.

#### Scenario: Seek via transcript click
- **WHEN** user clicks a transcript segment
- **THEN** the video seeks to the start timestamp of that segment
