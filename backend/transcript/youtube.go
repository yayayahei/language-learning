package transcript

import (
	"crypto/md5"
	"fmt"
	"regexp"
)

var youtubeIDPattern = regexp.MustCompile(`(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})`)

func ExtractVideoID(url string) (string, error) {
	m := youtubeIDPattern.FindStringSubmatch(url)
	if len(m) < 2 {
		return "", fmt.Errorf("could not extract YouTube video ID from URL: %s", url)
	}
	return m[1], nil
}

func VideoHash(videoID string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(videoID)))
}
