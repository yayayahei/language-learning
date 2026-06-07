## ADDED Requirements

### Requirement: Re-open watched video
The system SHALL allow users to re-open a previously watched video for verification, displaying the original interaction events and weak points overlaid on the timeline.

#### Scenario: Select video from history
- **WHEN** user navigates to their watch history and selects a previously watched video
- **THEN** the video loads with timeline markers showing where weak points were previously identified and where the user previously paused/rewound

### Requirement: Compare new interactions against weak points
The system SHALL track all interaction events during the re-watch and compare them against the saved weak point timestamps.

#### Scenario: Weak point matched with new pause
- **WHEN** user pauses during re-watch within 3 seconds of a saved weak point timestamp
- **THEN** the system records the match — the weak point remains active (not yet grasped)

#### Scenario: Weak point not matched
- **WHEN** user watches through a video and does NOT pause within 3 seconds of a saved weak point timestamp
- **THEN** the system records the pass — the weak point is a candidate for being marked as grasped

#### Scenario: New interaction at unmarked location
- **WHEN** user pauses at a timestamp not near any existing weak point
- **THEN** the system treats this as a new potential comprehension gap (surfaces sentences for new weak point marking)

### Requirement: Mark weak points as grasped
The system SHALL automatically suggest weak points as "grasped" when the user passes through their timestamp without pausing, and allow manual confirmation.

#### Scenario: Automatic grasped suggestion
- **WHEN** re-watch completes and some weak points were not matched
- **THEN** the system presents a summary: "You passed X weak points — confirm they are grasped?" with a list

#### Scenario: Manual grasped confirmation
- **WHEN** user confirms the suggestions
- **THEN** the weak points are marked as "grasped" and removed from the active training deck

#### Scenario: User rejects grasped suggestion
- **WHEN** user unchecks a weak point from the grasped suggestions
- **THEN** that weak point stays in the active training deck

### Requirement: Re-watch progress summary
The system SHALL display a comparison view after re-watch showing: total weak points, how many were passed, how many still triggered pauses, and new weak points discovered.

#### Scenario: Re-watch summary displayed
- **WHEN** user completes a re-watch session
- **THEN** a summary screen shows: passed count, still-struggling count, new weak points count, and an overall progress indicator
