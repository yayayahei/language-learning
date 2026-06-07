## ADDED Requirements

### Requirement: Selected PDF text is copied to clipboard
When the user selects text in the PDF viewer, the system SHALL automatically copy the selected text to the system clipboard.

#### Scenario: Text selection copies to clipboard
- **WHEN** user selects text in the PDF viewer by highlighting it with pointer or keyboard
- **THEN** the selected text is written to the system clipboard via the Clipboard API

### Requirement: Selection popup defaults to weak point type selection
When the selection popup appears after selecting text in the PDF viewer, the system SHALL display the weak point type selection view directly, skipping the action choice screen.

#### Scenario: Popup shows weak point type selection immediately
- **WHEN** user selects text in the PDF viewer
- **THEN** a popup appears with weak point type options (Word, Phrase, Idiom) and Save/Cancel buttons
- **AND** the "Add to Weak Points / Save as Precious Usage" action choice screen is not shown

#### Scenario: User can save as weak point
- **WHEN** user selects a type and clicks "Save"
- **THEN** the selection is saved as a weak point with the chosen type
- **AND** a "Saved!" confirmation is shown briefly before auto-dismissing
