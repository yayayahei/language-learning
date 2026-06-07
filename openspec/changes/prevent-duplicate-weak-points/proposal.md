## Why

Users can currently save the same word or phrase as a weak point multiple times, producing duplicates that clutter the weak points list and waste training time. The system should identify when a weak point already exists and prevent re-adding it.

## What Changes

- Backend: check for an existing weak point with the same `text` and `user_id` before inserting; return 409 Conflict if a duplicate is found
- Frontend: handle the 409 response in `SelectionMenu` by showing "Already saved" instead of "Saved"
- Add a `UNIQUE` index on `(text, user_id)` to enforce uniqueness at the database level

## Capabilities

### Modified Capabilities

- `weak-points`: The create endpoint SHALL reject duplicate weak points (same text for the same user) with a 409 Conflict response, and the frontend SHALL display an "Already saved" confirmation instead of creating a duplicate

## Impact

- **Backend**: `backend/handler/weakpoint.go` — add existence check before INSERT
- **Database**: New UNIQUE index on `weak_points(text, user_id)`
- **Frontend**: `frontend/src/components/SelectionMenu.tsx` — handle 409 response
- **No API contract changes** (same request/response shape, new status code)
