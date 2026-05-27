package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/db"
)

type InteractionHandler struct {
	db *db.DB
}

func NewInteractionHandler(d *db.DB) *InteractionHandler {
	return &InteractionHandler{db: d}
}

func (h *InteractionHandler) Register(r chi.Router) {
	r.Post("/api/interactions", h.create)
	r.Get("/api/interactions/{videoId}", h.list)
}

type interactionReq struct {
	VideoID    string `json:"video_id"`
	EventType  string `json:"event_type"`
	TimestampMs int64  `json:"timestamp_ms"`
}

func (h *InteractionHandler) create(w http.ResponseWriter, r *http.Request) {
	var reqs []interactionReq
	if err := json.NewDecoder(r.Body).Decode(&reqs); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for _, req := range reqs {
		if req.VideoID == "" || req.EventType == "" {
			continue
		}
		err := h.db.Conn().QueryRow(
			"INSERT INTO interactions (video_id, event_type, timestamp_ms) VALUES (?, ?, ?)",
			req.VideoID, req.EventType, req.TimestampMs,
		).Err()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save interaction")
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"saved": len(reqs),
	})
}

func (h *InteractionHandler) list(w http.ResponseWriter, r *http.Request) {
	videoID := chi.URLParam(r, "videoId")

	rows, err := h.db.Conn().Query(
		"SELECT id, event_type, timestamp_ms, created_at FROM interactions WHERE video_id = ? ORDER BY timestamp_ms ASC",
		videoID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var interactions []map[string]interface{}
	for rows.Next() {
		var id int64
		var eventType string
		var timestampMs int64
		var createdAt string
		if err := rows.Scan(&id, &eventType, &timestampMs, &createdAt); err != nil {
			continue
		}
		interactions = append(interactions, map[string]interface{}{
			"id":           id,
			"event_type":   eventType,
			"timestamp_ms": timestampMs,
			"created_at":   createdAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"interactions": interactions,
	})
}
