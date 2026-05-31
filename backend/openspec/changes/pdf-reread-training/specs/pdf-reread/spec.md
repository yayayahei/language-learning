## ADDED Requirements

### Requirement: Training cards show PDF re-read link
The system SHALL display a "Re-read context" link on training cards when the weak point has `source_type=pdf`. Clicking the link MUST navigate to the PDF viewer at the correct page.

#### Scenario: PDF weak point in training
- **WHEN** a spaced repetition card renders for a weak point with `source_type=pdf` and `source_id=<uuid>`
- **THEN** the card displays a clickable link labeled "Re-read (page N)" where N is the value of `timestamp_ms`

#### Scenario: Clicking re-read link
- **WHEN** the user clicks the "Re-read" link
- **THEN** the app navigates to `/pdf/<uuid>?page=N`

### Requirement: PdfPage accepts page query parameter
The system SHALL accept an optional `page` query parameter on the PDF viewer page. When present, the viewer MUST auto-scroll to that page after loading.

#### Scenario: Opening PDF with page param
- **WHEN** a user navigates to `/pdf/<uuid>?page=15`
- **THEN** the PDF viewer loads the document and scrolls to page 15

#### Scenario: Opening PDF without page param
- **WHEN** a user navigates to `/pdf/<uuid>` without a page param
- **THEN** the PDF viewer loads normally using the saved `last_page` position

### Requirement: SelectionMenu separates video_id from PDF context
The system SHALL NOT send `video_id` when creating a weak point with `source_type=pdf`. Only `source_id` and `source_type` SHALL be set for PDF-sourced weak points.

#### Scenario: Creating weak point from PDF
- **WHEN** a user selects text in a PDF and saves it as a weak point
- **THEN** the request body includes `source_type=pdf`, `source_id=<pdf-uuid>`, but NOT `video_id`
