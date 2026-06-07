package handler

import (
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/auth"
	"github.com/yayayahei/language-learning/backend/db"
)

type WeakPointHandler struct {
	db *db.DB
}

func NewWeakPointHandler(d *db.DB) *WeakPointHandler {
	return &WeakPointHandler{db: d}
}

func (h *WeakPointHandler) Register(r chi.Router) {
	r.Get("/api/weak-points", h.list)
	r.Post("/api/weak-points", h.create)
	r.Delete("/api/weak-points/{id}", h.delete)
	r.Post("/api/weak-points/train", h.sendToTraining)
	r.Post("/api/weak-points/{id}/grasp", h.grasp)
}

func (h *WeakPointHandler) create(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	var req struct {
		Text        string `json:"text"`
		WPType      string `json:"wp_type"`
		VideoID     string `json:"video_id"`
		Sentence    string `json:"sentence"`
		TimestampMs int64  `json:"timestamp_ms"`
		SourceType  string `json:"source_type"`
		SourceID    string `json:"source_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Text == "" || req.WPType == "" || req.Sentence == "" {
		writeError(w, http.StatusBadRequest, "text, wp_type, and sentence are required")
		return
	}
	if req.VideoID == "" && req.SourceID == "" {
		writeError(w, http.StatusBadRequest, "either video_id or source_id is required")
		return
	}

	st := req.SourceType
	if st == "" {
		st = "video"
	}

	// For PDFs, only use source_id (never video_id).
	// For videos, use video_id and default source_id to video_id.
	var vid interface{}
	sid := req.SourceID
	if st == "pdf" {
		if sid == "" {
			writeError(w, http.StatusBadRequest, "source_id is required for pdf")
			return
		}
	} else {
		if req.VideoID != "" {
			vid = req.VideoID
		}
		if sid == "" {
			sid = req.VideoID
		}
	}

	// Check if weak point already exists for this user
	var existingID int64
	err := h.db.Conn().QueryRow(
		"SELECT id FROM weak_points WHERE text = ? AND user_id = ? LIMIT 1",
		req.Text, userID,
	).Scan(&existingID)
	if err == nil {
		writeJSON(w, http.StatusConflict, map[string]interface{}{
			"error": "weak point already exists",
			"id":   existingID,
		})
		return
	}

	result, err := h.db.Conn().Exec(
		"INSERT INTO weak_points (text, wp_type, video_id, sentence, timestamp_ms, user_id, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		req.Text, req.WPType, vid, req.Sentence, req.TimestampMs, userID, st, sid,
	)
	if err != nil {
		slog.ErrorContext(r.Context(), "insert weak point failed",
			"error", err,
			"text", req.Text,
			"wp_type", req.WPType,
			"source_type", st,
		)
		writeError(w, http.StatusInternalServerError, "failed to create weak point")
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id})
}

func (h *WeakPointHandler) list(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	search := r.URL.Query().Get("search")
	wpType := r.URL.Query().Get("type")
	videoID := r.URL.Query().Get("video_id")

	query := "SELECT id, text, wp_type, video_id, sentence, timestamp_ms, in_training, grasped, created_at, COALESCE(source_type, 'video') as st, COALESCE(source_id, '') as si FROM weak_points WHERE user_id = ?"
	var args []interface{}
	args = append(args, userID)

	if search != "" {
		query += " AND text LIKE ?"
		args = append(args, "%"+search+"%")
	}
	if wpType != "" {
		query += " AND wp_type = ?"
		args = append(args, wpType)
	}
	if videoID != "" {
		query += " AND (video_id = ? OR source_id = ?)"
		args = append(args, videoID, videoID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.db.Conn().Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var points []map[string]interface{}
	for rows.Next() {
		var id int64
		var text, wpType, sentence, createdAt string
		var videoID sql.NullString
		var timestampMs int64
		var inTraining, grasped bool
		var st, si string
		if err := rows.Scan(&id, &text, &wpType, &videoID, &sentence, &timestampMs, &inTraining, &grasped, &createdAt, &st, &si); err != nil {
			continue
		}
		points = append(points, map[string]interface{}{
			"id":           id,
			"text":         text,
			"wp_type":      wpType,
			"video_id":     videoID.String,
			"sentence":     sentence,
			"timestamp_ms": timestampMs,
			"in_training":  inTraining,
			"grasped":      grasped,
			"created_at":   createdAt,
			"source_type":  st,
			"source_id":    si,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"weak_points": points})
}

func (h *WeakPointHandler) delete(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = h.db.Conn().Exec("DELETE FROM weak_points WHERE id = ? AND user_id = ?", id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *WeakPointHandler) sendToTraining(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for _, id := range req.IDs {
		_, err := h.db.Conn().Exec(
			"UPDATE weak_points SET in_training = TRUE WHERE id = ? AND user_id = ?",
			id, userID,
		)
		if err != nil {
			continue
		}

		_, err = h.db.Conn().Exec(
			"INSERT IGNORE INTO training_state (weak_point_id, next_review) VALUES (?, CURDATE())",
			id,
		)
		if err != nil {
			continue
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *WeakPointHandler) grasp(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = h.db.Conn().Exec(
		"UPDATE weak_points SET grasped = TRUE, in_training = FALSE WHERE id = ? AND user_id = ?",
		id, userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to mark as grasped")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "grasped"})
}
