package handler

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/yayayahei/language-learning/backend/auth"
	"github.com/yayayahei/language-learning/backend/db"
)

type TrainingHandler struct {
	db *db.DB
}

func NewTrainingHandler(d *db.DB) *TrainingHandler {
	return &TrainingHandler{db: d}
}

func (h *TrainingHandler) Register(r chi.Router) {
	r.Get("/api/training/due", h.getDue)
	r.Post("/api/training/review", h.review)
}

type dueCard struct {
	ID          int64   `json:"id"`
	Text        string  `json:"text"`
	WPType      string  `json:"wp_type"`
	Sentence    string  `json:"sentence"`
	VideoID     string  `json:"video_id"`
	TimestampMs int64   `json:"timestamp_ms"`
	Easiness    float64 `json:"easiness_factor"`
	Interval    int     `json:"interval"`
	Repetitions int     `json:"repetitions"`
	SourceType  string  `json:"source_type"`
	SourceID    string  `json:"source_id"`
}

func (h *TrainingHandler) getDue(w http.ResponseWriter, r *http.Request) {
	userID, _ := auth.GetUserID(r)
	rows, err := h.db.Conn().Query(`
		SELECT wp.id, wp.text, wp.wp_type, wp.sentence,
		       wp.video_id, wp.timestamp_ms,
		       COALESCE(ts.easiness_factor, 2.5),
		       COALESCE(ts.interval, 0),
		       COALESCE(ts.repetitions, 0),
		       COALESCE(wp.source_type, 'video'),
		       COALESCE(wp.source_id, '')
		FROM weak_points wp
		JOIN training_state ts ON ts.weak_point_id = wp.id
		WHERE wp.in_training = TRUE
		  AND wp.grasped = FALSE
		  AND wp.user_id = ?
		  AND ts.next_review <= CURDATE()
		ORDER BY ts.next_review ASC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var cards []dueCard
	for rows.Next() {
		var c dueCard
		if err := rows.Scan(&c.ID, &c.Text, &c.WPType, &c.Sentence, &c.VideoID, &c.TimestampMs, &c.Easiness, &c.Interval, &c.Repetitions, &c.SourceType, &c.SourceID); err != nil {
			continue
		}
		cards = append(cards, c)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"cards": cards})
}

func (h *TrainingHandler) review(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID      int64 `json:"id"`
		Correct bool  `json:"correct"`
		Quality int   `json:"quality"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var easiness float64
	var interval int
	var reps int
	err := h.db.Conn().QueryRow(
		"SELECT easiness_factor, `interval`, repetitions FROM training_state WHERE weak_point_id = ?",
		req.ID,
	).Scan(&easiness, &interval, &reps)
	if err != nil {
		easiness = 2.5
		interval = 0
		reps = 0
	}

	quality := req.Quality
	if quality == 0 {
		if req.Correct {
			quality = 4
		} else {
			quality = 1
		}
	}

	if quality >= 3 {
		reps++
		switch reps {
		case 1:
			interval = 1
		case 2:
			interval = 6
		default:
			interval = int(math.Round(float64(interval) * easiness))
		}
	} else {
		reps = 0
		interval = 1
	}

	easiness = easiness + 0.1 - float64(5-quality)*(0.08+float64(5-quality)*0.02)
	if easiness < 1.3 {
		easiness = 1.3
	}

	nextReview := time.Now().AddDate(0, 0, interval)

	_, err = h.db.Conn().Exec(`
		INSERT INTO training_state (weak_point_id, easiness_factor, `+"`interval`"+`, repetitions, next_review, last_reviewed)
		VALUES (?, ?, ?, ?, ?, NOW())
		ON DUPLICATE KEY UPDATE
			easiness_factor = VALUES(easiness_factor),
			`+"`interval`"+` = VALUES(`+"`interval`"+`),
			repetitions = VALUES(repetitions),
			next_review = VALUES(next_review),
			last_reviewed = VALUES(last_reviewed)
	`, req.ID, easiness, interval, reps, nextReview.Format("2006-01-02"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update training state")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":      "ok",
		"interval":    interval,
		"easiness":    easiness,
		"repetitions": reps,
		"next_review": nextReview.Format("2006-01-02"),
	})
}
