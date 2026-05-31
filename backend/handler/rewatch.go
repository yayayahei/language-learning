package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/auth"
	"github.com/yayayahei/language-learning/backend/db"
)

type RewatchHandler struct {
	db *db.DB
}

func NewRewatchHandler(d *db.DB) *RewatchHandler {
	return &RewatchHandler{db: d}
}

func (h *RewatchHandler) Register(r chi.Router) {
	r.Post("/api/rewatch/start", h.start)
	r.Get("/api/rewatch/summary/{id}", h.summary)
}

func (h *RewatchHandler) start(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	var req struct {
		VideoID string `json:"video_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.db.Conn().Exec(
		"INSERT INTO rewatch_sessions (video_id, user_id) VALUES (?, ?)",
		req.VideoID, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start rewatch session")
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusOK, map[string]interface{}{"session_id": id})
}

func (h *RewatchHandler) summary(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var videoID string
	var startedAt, finishedAt string
	var passed, struggled, newWP int
	err = h.db.Conn().QueryRow(
		"SELECT video_id, started_at, COALESCE(finished_at, ''), passed_count, struggled_count, new_weak_points_count FROM rewatch_sessions WHERE id = ? AND user_id = ?",
		id, userID,
	).Scan(&videoID, &startedAt, &finishedAt, &passed, &struggled, &newWP)
	if err != nil {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"session_id":           id,
		"video_id":             videoID,
		"started_at":           startedAt,
		"finished_at":          finishedAt,
		"passed_count":         passed,
		"struggled_count":      struggled,
		"new_weak_points_count": newWP,
	})
}
