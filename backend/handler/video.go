package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
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
}

func (h *VideoHandler) list(w http.ResponseWriter, r *http.Request) {
	videos, err := h.db.ListVideos()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list videos")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"videos": videos})
}
