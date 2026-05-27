## ADDED Requirements

### Requirement: Upload PDF document
The system SHALL allow users to upload PDF files via the frontend. Uploaded files MUST be stored on the server filesystem, with metadata saved to the `pdf_documents` table. The upload size limit SHALL be 20MB.

#### Scenario: Successful PDF upload
- **WHEN** user selects a PDF file (under 20MB) and submits the upload form
- **THEN** the file is saved to the uploads directory, a UUID is generated, metadata is stored in `pdf_documents`, and the user is redirected to the PDF reader page for that document

#### Scenario: File too large
- **WHEN** user attempts to upload a PDF larger than 20MB
- **THEN** the upload is rejected with an error message "File too large (max 20MB)"

#### Scenario: Non-PDF file
- **WHEN** user attempts to upload a file that is not a PDF
- **THEN** the upload is rejected with an error message "Only PDF files are supported"

### Requirement: Render PDF in browser
The system SHALL render an uploaded PDF in the browser using pdfjs-dist, displaying one page at a time on a canvas element with a selectable text layer overlay.

#### Scenario: Load and display PDF
- **WHEN** user navigates to the PDF reader page for a document
- **THEN** the first page of the PDF is rendered on a canvas with a transparent text layer allowing native text selection

#### Scenario: Navigate between pages
- **WHEN** user clicks "Next" or "Previous" buttons
- **THEN** the adjacent page is rendered, and the current page number display updates

#### Scenario: Jump to specific page
- **WHEN** user types a page number in the page input and submits
- **THEN** the specified page is rendered (if within valid range)

#### Scenario: PDF fails to load
- **WHEN** the PDF file cannot be fetched or parsed
- **THEN** an error message "Failed to load PDF" is displayed

### Requirement: List uploaded PDFs
The system SHALL provide a list of all uploaded PDF documents on the PDF reader page (when no document is selected), ordered by most recent first.

#### Scenario: No PDFs uploaded
- **WHEN** user navigates to the PDF page and no PDFs have been uploaded
- **THEN** an empty state message "No PDFs yet. Upload one to get started." is displayed along with an upload button

#### Scenario: Existing PDFs listed
- **WHEN** user navigates to the PDF page and PDFs exist
- **THEN** each PDF is shown with its title (or filename fallback) and upload date, and clicking one opens it in the reader
