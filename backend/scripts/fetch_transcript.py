"""Fetch YouTube transcript as JSON segments."""
import json
import sys
import re
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url: str) -> str:
    m = re.search(r"(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})", url)
    if m:
        return m[1]
    return url.strip()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "no URL provided"}))
        sys.exit(1)

    video_id = extract_video_id(sys.argv[1])

    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
    except Exception as e:
        print(json.dumps({"error": f"failed to fetch transcript: {e}"}))
        sys.exit(1)

    segments = []
    for entry in transcript:
        segments.append({
            "text": entry.text,
            "start_ms": int(entry.start * 1000),
            "end_ms": int((entry.start + entry.duration) * 1000),
        })

    print(json.dumps({"segments": segments, "language": "en"}))
    sys.exit(0)

if __name__ == "__main__":
    main()
