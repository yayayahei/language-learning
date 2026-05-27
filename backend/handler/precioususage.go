package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/db"
)

type PreciousUsageHandler struct {
	db *db.DB
}

func NewPreciousUsageHandler(d *db.DB) *PreciousUsageHandler {
	return &PreciousUsageHandler{db: d}
}

func (h *PreciousUsageHandler) Register(r chi.Router) {
	r.Get("/api/precious-usages", h.list)
	r.Post("/api/precious-usages", h.create)
	r.Delete("/api/precious-usages/{id}", h.delete)
}

func (h *PreciousUsageHandler) create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text       string `json:"text"`
		PUType     string `json:"pu_type"`
		SourceType string `json:"source_type"`
		SourceID   string `json:"source_id"`
		Sentence   string `json:"sentence"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Text == "" || req.PUType == "" || req.SourceType == "" || req.SourceID == "" {
		writeError(w, http.StatusBadRequest, "text, pu_type, source_type, and source_id are required")
		return
	}

	result, err := h.db.Conn().Exec(
		"INSERT INTO precious_usages (text, pu_type, source_type, source_id, sentence) VALUES (?, ?, ?, ?, ?)",
		req.Text, req.PUType, req.SourceType, req.SourceID, req.Sentence,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create precious usage")
		return
	}

	id, _ := result.LastInsertId()
	writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id})
}

func (h *PreciousUsageHandler) list(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	puType := r.URL.Query().Get("type")

	query := "SELECT id, text, pu_type, source_type, source_id, sentence, created_at FROM precious_usages WHERE 1=1"
	var args []interface{}

	if search != "" {
		query += " AND text LIKE ?"
		args = append(args, "%"+search+"%")
	}
	if puType != "" {
		query += " AND pu_type = ?"
		args = append(args, puType)
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.db.Conn().Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var id int64
		var text, puType, sourceType, sourceID, createdAt string
		var sentence string
		if err := rows.Scan(&id, &text, &puType, &sourceType, &sourceID, &sentence, &createdAt); err != nil {
			continue
		}
		items = append(items, map[string]interface{}{
			"id":          id,
			"text":        text,
			"pu_type":     puType,
			"source_type": sourceType,
			"source_id":   sourceID,
			"sentence":    sentence,
			"created_at":  createdAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"precious_usages": items})
}

func (h *PreciousUsageHandler) delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	_, err = h.db.Conn().Exec("DELETE FROM precious_usages WHERE id = ?", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
