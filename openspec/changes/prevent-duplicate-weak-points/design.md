## Context

Currently `POST /api/weak-points` performs a blind INSERT with no duplicate check. The `weak_points` table has no UNIQUE constraint on `text` + `user_id`, so the same word can be saved repeatedly.

## Goals / Non-Goals

**Goals:**
- Prevent saving a weak point with the same text for the same user
- Show a clear "Already saved" message instead of silently succeeding
- Guard against race conditions (two concurrent saves of the same text)

**Non-Goals:**
- Fuzzy matching or case-insensitive dedup
- Cross-user dedup
- Dedup for precious usages (separate concern)

## Decisions

### App-level SELECT check + UNIQUE index

Two layers of protection:
1. **App-level**: Before INSERT, SELECT for an existing row with the same `text` and `user_id`. If found, return 409 with a message.
2. **Database-level**: Add a UNIQUE index on `(text(255), user_id)` as a race-condition safety net.

The app-level check handles the common case and produces a clean user-facing response. The UNIQUE index ensures correctness under concurrency — if two requests race past the SELECT, one INSERT will fail with a duplicate key error.

**Why not just the UNIQUE index:** Parsing MySQL error codes (1062) to produce a friendly 409 response couples the handler to MySQL specifics and muddies the error path.

**Why not just the SELECT check:** Without the UNIQUE index, concurrent requests could both pass the SELECT and both INSERT.

### UNIQUE index uses prefix on text column

`text` is `VARCHAR(1024)`. MySQL limits UNIQUE index key length to 3072 bytes (InnoDB with `innodb_large_prefix`). With `utf8mb4`, each character can be up to 4 bytes, so `1024 * 4 = 4096` exceeds the limit. Using `text(255)` restricts the index to the first 255 characters (~1020 bytes with utf8mb4), well within the limit. For language learning weak points, the first 255 characters are sufficient for dedup.

### 409 Conflict response

The endpoint returns `409 Conflict` with a JSON body `{"error": "weak point already exists", "id": <existing_id>}`. This is semantically correct HTTP and lets the frontend distinguish "already exists" from other errors.

### Frontend: handle 409 in SelectionMenu

In `handleSaveWeakPoint`, when the response status is 409, set `doneLabel` to "Already saved as weak point" and transition to the done state (which auto-dismisses after 1.5s). No structural changes to the component needed.

## Risks / Trade-offs

- **Existing duplicates in production**: Users may already have duplicates from before this change. → Not addressed here (no migration); the UNIQUE index will fail on creation if duplicates exist, so existing dupes need cleanup first or the index creation must handle them.
- **Index creation failure on existing dupes**: `CREATE UNIQUE INDEX` fails if duplicates already exist. → Migration step: `DELETE` duplicate rows (keep the oldest by `id`) before creating the index, or use `ALTER IGNORE` (deprecated in MySQL 8).
- **`text(255)` prefix may miss duplicates in edge cases**: Two weak points with texts longer than 255 chars that differ only after char 255 would not be caught by the index. → Extremely unlikely for language learning content; the app-level SELECT catches them with full text comparison.
