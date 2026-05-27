package db

import (
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/yayayahei/language-learning/backend/transcript"
)

var ErrDBUnavailable = errors.New("database unavailable")

type DB struct {
	conn *sql.DB
}

func New(conn *sql.DB) *DB {
	return &DB{conn: conn}
}

func (d *DB) Conn() *sql.DB {
	return d.conn
}

func (d *DB) Ready() bool {
	return d.conn != nil
}

func (d *DB) InitSchema() error {
	if d.conn == nil {
		return ErrDBUnavailable
	}
	_, err := d.conn.Exec(`
	CREATE TABLE IF NOT EXISTS videos (
		id VARCHAR(32) PRIMARY KEY,
		url VARCHAR(2048) NOT NULL,
		title VARCHAR(512) DEFAULT '',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		return err
	}

	_, err = d.conn.Exec(`
	CREATE TABLE IF NOT EXISTS transcripts (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		video_id VARCHAR(32) NOT NULL,
		language VARCHAR(16) DEFAULT '',
		segments JSON NOT NULL,
		fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
		UNIQUE KEY (video_id, language)
	)`)
	if err != nil {
		return err
	}

	_, err = d.conn.Exec(`
	CREATE TABLE IF NOT EXISTS interactions (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		video_id VARCHAR(32) NOT NULL,
		event_type ENUM('pause', 'rewind', 'forward') NOT NULL,
		timestamp_ms BIGINT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
		INDEX idx_video_id (video_id)
	)`)
	if err != nil {
		return err
	}

	_, err = d.conn.Exec(`
	CREATE TABLE IF NOT EXISTS weak_points (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		text VARCHAR(1024) NOT NULL,
		wp_type ENUM('word', 'phrase', 'idiom') NOT NULL,
		video_id VARCHAR(32) NOT NULL,
		sentence TEXT NOT NULL,
		timestamp_ms BIGINT NOT NULL,
		in_training BOOLEAN DEFAULT FALSE,
		grasped BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
		INDEX idx_video_id (video_id),
		INDEX idx_in_training (in_training),
		INDEX idx_grasped (grasped)
	)`)
	if err != nil {
		return err
	}

	_, err = d.conn.Exec(`
	CREATE TABLE IF NOT EXISTS training_state (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		weak_point_id BIGINT NOT NULL,
		easiness_factor DOUBLE DEFAULT 2.5,
		` + "`interval`" + ` INT DEFAULT 0,
		repetitions INT DEFAULT 0,
		next_review DATE NOT NULL,
		last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (weak_point_id) REFERENCES weak_points(id) ON DELETE CASCADE,
		UNIQUE KEY (weak_point_id)
	)`)
	if err != nil {
		return err
	}

	_, err = d.conn.Exec(`
	CREATE TABLE IF NOT EXISTS rewatch_sessions (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		video_id VARCHAR(32) NOT NULL,
		started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		finished_at TIMESTAMP NULL,
		passed_count INT DEFAULT 0,
		struggled_count INT DEFAULT 0,
		new_weak_points_count INT DEFAULT 0,
		FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
	)`)
	return err
}

// Video methods
func (d *DB) UpsertVideo(id, url string) error {
	_, err := d.conn.Exec(
		"INSERT INTO videos (id, url) VALUES (?, ?) ON DUPLICATE KEY UPDATE url = VALUES(url)",
		id, url,
	)
	return err
}

func (d *DB) ListVideos() ([]map[string]interface{}, error) {
	rows, err := d.conn.Query("SELECT id, url, title, created_at FROM videos ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var videos []map[string]interface{}
	for rows.Next() {
		var id, url, title, createdAt string
		if err := rows.Scan(&id, &url, &title, &createdAt); err != nil {
			return nil, err
		}
		videos = append(videos, map[string]interface{}{
			"id":         id,
			"url":        url,
			"title":      title,
			"created_at": createdAt,
		})
	}
	return videos, nil
}

// Transcript methods
func (d *DB) SaveTranscript(videoID, language string, segments []transcript.Segment) error {
	segmentsJSON, err := json.Marshal(segments)
	if err != nil {
		return err
	}
	_, err = d.conn.Exec(
		"INSERT INTO transcripts (video_id, language, segments) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE segments = VALUES(segments)",
		videoID, language, string(segmentsJSON),
	)
	return err
}

func (d *DB) GetTranscript(videoID string) (string, []transcript.Segment, error) {
	var language string
	var segmentsJSON string
	err := d.conn.QueryRow(
		"SELECT language, segments FROM transcripts WHERE video_id = ? LIMIT 1",
		videoID,
	).Scan(&language, &segmentsJSON)
	if err != nil {
		return "", nil, err
	}

	var segments []transcript.Segment
	if err := json.Unmarshal([]byte(segmentsJSON), &segments); err != nil {
		return "", nil, err
	}
	return language, segments, nil
}
