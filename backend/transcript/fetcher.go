package transcript

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type Segment struct {
	Text    string `json:"text"`
	StartMs int64  `json:"start_ms"`
	EndMs   int64  `json:"end_ms"`
}

type Fetcher struct {
	scriptPath string
	pythonPath string
}

func NewFetcher() *Fetcher {
	return &Fetcher{
		scriptPath: resolveScript(),
		pythonPath: resolvePython(),
	}
}

func resolvePython() string {
	for _, p := range []string{"python3", "python"} {
		if _, err := exec.LookPath(p); err == nil {
			return p
		}
	}
	return "python3"
}

func resolveScript() string {
	if p := os.Getenv("TRANSCRIPT_SCRIPT"); p != "" {
		return p
	}
	candidates := []string{
		"scripts/fetch_transcript.py",
		"backend/scripts/fetch_transcript.py",
		"../backend/scripts/fetch_transcript.py",
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			abs, _ := filepath.Abs(p)
			return abs
		}
	}
	return "scripts/fetch_transcript.py"
}

func (f *Fetcher) FetchCaptions(videoURL string) ([]Segment, string, error) {
	cmd := exec.Command(f.pythonPath, f.scriptPath, videoURL)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, "", fmt.Errorf("transcript fetch failed: %w (stderr: %s)", err, stderr.String())
	}

	var result struct {
		Segments []Segment `json:"segments"`
		Language string    `json:"language"`
		Error    string    `json:"error"`
	}
	if err := json.Unmarshal(stdout.Bytes(), &result); err != nil {
		return nil, "", fmt.Errorf("failed to parse transcript output: %w", err)
	}

	if result.Error != "" {
		return nil, "", fmt.Errorf("%s", result.Error)
	}

	return result.Segments, result.Language, nil
}
