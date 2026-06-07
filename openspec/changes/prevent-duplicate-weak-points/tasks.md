## 1. Database

- [x] 1.1 Add UNIQUE index on `weak_points(text(255), user_id)` to `backend/db/schema.sql`
- [x] 1.2 Add migration SQL to clean up existing duplicates (keep oldest `id` per `text` + `user_id` group) and create the index

## 2. Backend

- [x] 2.1 Add SELECT check in `POST /api/weak-points` handler — query for existing weak point with same `text` and `user_id` before INSERT
- [x] 2.2 Return 409 Conflict with `{"error": "weak point already exists", "id": <id>}` when duplicate detected

## 3. Frontend

- [x] 3.1 Handle 409 response in `SelectionMenu.tsx` `handleSaveWeakPoint` — show "Already saved as weak point" and transition to done state (auto-dismiss)
