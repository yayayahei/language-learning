package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/auth"
	"github.com/yayayahei/language-learning/backend/db"
	"github.com/yayayahei/language-learning/backend/transcript"
)

type TranscriptHandler struct {
	db      *db.DB
	fetcher *transcript.Fetcher
}

func NewTranscriptHandler(d *db.DB, f *transcript.Fetcher) *TranscriptHandler {
	return &TranscriptHandler{db: d, fetcher: f}
}

func (h *TranscriptHandler) Register(r chi.Router) {
	r.Post("/api/transcripts", h.fetch)
	r.Get("/api/transcripts/{videoId}", h.get)
}

func (h *TranscriptHandler) fetch(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}

	videoID, err := transcript.ExtractVideoID(req.URL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	segments, lang, err := h.fetcher.FetchCaptions(req.URL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch transcript: "+err.Error())
		return
	}

	if err := h.db.UpsertVideo(videoID, req.URL, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save video: "+err.Error())
		return
	}

	if err := h.db.SaveTranscript(videoID, lang, segments); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to cache transcript: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"video_id":  videoID,
		"language":  lang,
		"segments":  segments,
		"cached":    false,
	})
}

func (h *TranscriptHandler) get(w http.ResponseWriter, r *http.Request) {
	videoID := chi.URLParam(r, "videoId")

	lang, segments, err := h.db.GetTranscript(videoID)
	if err != nil {
		writeError(w, http.StatusNotFound, "transcript not found for this video")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"video_id": videoID,
		"language": lang,
		"segments": segments,
		"cached":   true,
	})
}
