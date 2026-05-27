package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
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
	var req struct {
		Text        string `json:"text"`
		WPType      string `json:"wp_type"`
		VideoID     string `json:"video_id"`
		Sentence    string `json:"sentence"`
		TimestampMs int64  `json:"timestamp_ms"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Text == "" || req.WPType == "" || req.VideoID == "" || req.Sentence == "" {
		writeError(w, http.StatusBadRequest, "text, wp_type, video_id, and sentence are required")
		return
	}

	result, err := h.db.Conn().Exec(
		"INSERT INTO weak_points (text, wp_type, video_id, sentence, timestamp_ms) VALUES (?, ?, ?, ?, ?)",
		req.Text, req.WPType, req.VideoID, req.Sentence, req.TimestampMs,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create weak point")
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id})
}

func (h *WeakPointHandler) list(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	wpType := r.URL.Query().Get("type")

	query := "SELECT id, text, wp_type, video_id, sentence, timestamp_ms, in_training, grasped, created_at FROM weak_points WHERE 1=1"
	var args []interface{}

	if search != "" {
		query += " AND text LIKE ?"
		args = append(args, "%"+search+"%")
	}
	if wpType != "" {
		query += " AND wp_type = ?"
		args = append(args, wpType)
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
		var text, wpType, videoID, sentence, createdAt string
		var timestampMs int64
		var inTraining, grasped bool
		if err := rows.Scan(&id, &text, &wpType, &videoID, &sentence, &timestampMs, &inTraining, &grasped, &createdAt); err != nil {
			continue
		}
		points = append(points, map[string]interface{}{
			"id":           id,
			"text":         text,
			"wp_type":      wpType,
			"video_id":     videoID,
			"sentence":     sentence,
			"timestamp_ms": timestampMs,
			"in_training":  inTraining,
			"grasped":      grasped,
			"created_at":   createdAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"weak_points": points})
}

func (h *WeakPointHandler) delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = h.db.Conn().Exec("DELETE FROM weak_points WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *WeakPointHandler) sendToTraining(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for _, id := range req.IDs {
		// Mark as in training
		_, err := h.db.Conn().Exec(
			"UPDATE weak_points SET in_training = TRUE WHERE id = ?",
			id,
		)
		if err != nil {
			continue
		}

		// Create training state if not exists
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
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = h.db.Conn().Exec(
		"UPDATE weak_points SET grasped = TRUE, in_training = FALSE WHERE id = ?",
		id,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to mark as grasped")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "grasped"})
}
