package transcript

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

type Segment struct {
	Text    string `json:"text"`
	StartMs int64  `json:"start_ms"`
	EndMs   int64  `json:"end_ms"`
}

type Fetcher struct {
	ytDlpPath string
}

func NewFetcher() *Fetcher {
	return &Fetcher{ytDlpPath: "yt-dlp"}
}

func (f *Fetcher) FetchCaptions(videoURL string) ([]Segment, string, error) {
	cmd := exec.Command(f.ytDlpPath,
		"--skip-download",
		"--write-auto-subs",
		"--sub-format", "json3",
		"--sub-langs", "en",
		"--convert-subs", "srt",
		"--output", "-",
		"--print", "after_video:filename",
		videoURL,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, "", fmt.Errorf("yt-dlp failed: %w\nOutput: %s", err, string(output))
	}

	var segments []Segment
	lang := "en"
	segments, lang, err = f.parseCaptions(videoURL)
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse captions: %w", err)
	}

	return segments, lang, nil
}

func (f *Fetcher) parseCaptions(videoURL string) ([]Segment, string, error) {
	cmd := exec.Command(f.ytDlpPath,
		"--skip-download",
		"--write-auto-subs",
		"--sub-format", "json3",
		"--sub-langs", "en",
		"--convert-subs", "srt",
		"-o", "-",
		"--print", "after_video:requested_subtitles",
		videoURL,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, "", fmt.Errorf("yt-dlp subtitle extract failed: %w\nOutput: %s", err, string(output))
	}

	segments, err := parseJSON3Subs(string(output))
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse JSON3 subs: %w", err)
	}

	lang := detectLanguage(string(output))
	return segments, lang, nil
}

type json3Event struct {
	SEpochMs float64 `json:"sEpochMs"`
	DurMs    float64 `json:"durMs"`
	Segs     []struct {
		Utf8 string `json:"utf8"`
	} `json:"segs"`
}

func parseJSON3Subs(raw string) ([]Segment, error) {
	// Extract JSON array from yt-dlp output
	re := regexp.MustCompile(`\[[\s\S]*\]`)
	match := re.FindString(raw)
	if match == "" {
		// Try parsing the whole output as JSON
		match = raw
	}

	var events []json3Event
	if err := json.Unmarshal([]byte(match), &events); err != nil {
		// Try cleaning newlines
		cleaned := strings.ReplaceAll(match, "\n", "")
		if err2 := json.Unmarshal([]byte(cleaned), &events); err2 != nil {
			return nil, fmt.Errorf("json unmarshal failed: %w (raw preview: %.200s)", err, raw)
		}
	}

	var segments []Segment
	for _, event := range events {
		var textParts []string
		for _, seg := range event.Segs {
			if seg.Utf8 != "" {
				textParts = append(textParts, seg.Utf8)
			}
		}
		text := strings.Join(textParts, " ")
		if text == "" {
			continue
		}
		segments = append(segments, Segment{
			Text:    text,
			StartMs: int64(event.SEpochMs),
			EndMs:   int64(event.SEpochMs + event.DurMs),
		})
	}
	return segments, nil
}

func detectLanguage(raw string) string {
	// yt-dlp output contains language info like "lang": "en"
	re := regexp.MustCompile(`"lang"\s*:\s*"(\w+)"`)
	m := re.FindStringSubmatch(raw)
	if len(m) > 1 {
		return m[1]
	}
	return "unknown"
}
