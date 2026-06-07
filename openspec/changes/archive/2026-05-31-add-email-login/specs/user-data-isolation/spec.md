## ADDED Requirements

### Requirement: All data writes are associated with the authenticated user
The system SHALL associate every new record (video, weak point, interaction, rewatch session, PDF, precious usage) with the authenticated user's ID. Unauthenticated requests to write endpoints SHALL return 401.

#### Scenario: Creating a weak point while logged in
- **WHEN** an authenticated user creates a weak point via `POST /api/weak-points`
- **THEN** the weak point is saved with the user's ID from the session

#### Scenario: Creating a weak point while logged out
- **WHEN** an unauthenticated request is sent to `POST /api/weak-points`
- **THEN** the system returns 401 Unauthorized

### Requirement: All data reads are filtered to the authenticated user
The system SHALL only return data belonging to the authenticated user. Users MUST NOT see other users' data.

#### Scenario: Listing weak points while logged in
- **WHEN** an authenticated user requests `GET /api/weak-points`
- **THEN** only weak points belonging to that user are returned

#### Scenario: Listing videos while logged in
- **WHEN** an authenticated user requests `GET /api/videos`
- **THEN** only videos belonging to that user are returned

### Requirement: Frontend routes are protected
The React frontend SHALL redirect unauthenticated users to the login page. The login and signup pages SHALL be accessible without authentication.

#### Scenario: Accessing protected page while logged out
- **WHEN** a user without a session navigates to any page other than login or signup
- **THEN** the app redirects to `/login`

#### Scenario: Accessing login page while logged in
- **WHEN** a user with a valid session navigates to `/login`
- **THEN** the app redirects to `/` (home page)
