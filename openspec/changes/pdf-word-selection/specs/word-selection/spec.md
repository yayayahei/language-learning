## ADDED Requirements

### Requirement: Select text in PDF
The system SHALL detect when the user selects text in the PDF text layer and capture the selected text string and PDF context (page number, surrounding sentence).

#### Scenario: Text selected in PDF
- **WHEN** user selects text in the PDF text layer with the pointer
- **THEN** the selected text string is captured, and a context menu appears at the pointer position

#### Scenario: Selection is empty or whitespace
- **WHEN** user releases the pointer with no text selected or only whitespace
- **THEN** no context menu is shown

### Requirement: Context menu for selected text
The system SHALL display a context menu upon text selection with two actions: "Add to Weak Points" and "Save as Precious Usage".

#### Scenario: Context menu shown
- **WHEN** user selects text in the PDF
- **THEN** a context menu appears near the selection with two buttons labeled "Add to Weak Points" and "Save as Precious Usage"

#### Scenario: Context menu dismissed
- **WHEN** user clicks outside the context menu or presses Escape
- **THEN** the context menu is removed from the DOM

### Requirement: Save selected text as weak point
The system SHALL allow users to save selected PDF text as a weak point. After choosing the action, an inline form SHALL prompt for the weak point type (word, phrase, idiom) and the surrounding sentence before saving.

#### Scenario: Save as weak point
- **WHEN** user selects text, clicks "Add to Weak Points", picks a type, and confirms
- **THEN** a weak point is created with `source_type='pdf'`, `source_id` set to the current PDF's UUID, `video_id=NULL`, and the page number stored in `timestamp_ms`

#### Scenario: Cancel weak point creation
- **WHEN** user opens the weak point form but clicks cancel or dismisses it
- **THEN** no weak point is created and the context menu is removed

### Requirement: Save selected text as precious usage
The system SHALL allow users to save selected PDF text as precious usage. After choosing the action, an inline form SHALL prompt for the precious usage type (word, phrase, expression) and optionally the surrounding sentence before saving.

#### Scenario: Save as precious usage
- **WHEN** user selects text, clicks "Save as Precious Usage", picks a type, and confirms
- **THEN** a precious usage entry is created with `source_type='pdf'`, `source_id` set to the current PDF's UUID

#### Scenario: Cancel precious usage creation
- **WHEN** user opens the precious usage form but clicks cancel or dismisses it
- **THEN** no precious usage entry is created and the context menu is removed
