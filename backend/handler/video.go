package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/auth"
	"github.com/yayayahei/language-learning/backend/db"
)

type VideoHandler struct {
	db *db.DB
}

func NewVideoHandler(d *db.DB) *VideoHandler {
	return &VideoHandler{db: d}
}

func (h *VideoHandler) Register(r chi.Router) {
	r.Get("/api/videos", h.list)
	r.Put("/api/videos/{id}/position", h.savePosition)
	r.Get("/api/videos/{id}/position", h.getPosition)
	r.Delete("/api/videos/{id}", h.delete)
}

func (h *VideoHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	videos, err := h.db.ListVideos(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list videos")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"videos": videos})
}

func (h *VideoHandler) savePosition(w http.ResponseWriter, r *http.Request) {
	videoID := chi.URLParam(r, "id")
	userID, _ := auth.GetUserID(r)

	var req struct {
		PositionMs int64 `json:"position_ms"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.db.SavePlaybackPosition(videoID, userID, req.PositionMs); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save position")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *VideoHandler) getPosition(w http.ResponseWriter, r *http.Request) {
	videoID := chi.URLParam(r, "id")
	userID, _ := auth.GetUserID(r)

	pos, err := h.db.GetPlaybackPosition(videoID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get position")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"position_ms": pos,
	})
}

func (h *VideoHandler) delete(w http.ResponseWriter, r *http.Request) {
	videoID := chi.URLParam(r, "id")
	userID, _ := auth.GetUserID(r)

	if err := h.db.DeleteVideo(videoID, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete video")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
