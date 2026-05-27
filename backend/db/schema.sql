CREATE DATABASE IF NOT EXISTS language_learning;
USE language_learning;

CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(32) PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    title VARCHAR(512) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transcripts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(32) NOT NULL,
    language VARCHAR(16) DEFAULT '',
    segments JSON NOT NULL,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE KEY (video_id, language)
);

CREATE TABLE IF NOT EXISTS interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(32) NOT NULL,
    event_type ENUM('pause', 'rewind', 'forward') NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id)
);

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
);

CREATE TABLE IF NOT EXISTS training_state (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    weak_point_id BIGINT NOT NULL,
    easiness_factor DOUBLE DEFAULT 2.5,
    `interval` INT DEFAULT 0,
    repetitions INT DEFAULT 0,
    next_review DATE NOT NULL,
    last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (weak_point_id) REFERENCES weak_points(id) ON DELETE CASCADE,
    UNIQUE KEY (weak_point_id)
);

CREATE TABLE IF NOT EXISTS rewatch_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(32) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    passed_count INT DEFAULT 0,
    struggled_count INT DEFAULT 0,
    new_weak_points_count INT DEFAULT 0,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);
