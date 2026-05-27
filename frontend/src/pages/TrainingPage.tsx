import { useState, useEffect, useRef, useCallback } from 'react'

type Card = {
  id: number
  text: string
  wp_type: string
  sentence: string
  video_id: string
  timestamp_ms: number
  easiness_factor: number
  interval: number
  repetitions: number
}

function VideoContext({ videoId, timestampMs }: { videoId: string; timestampMs: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const playerId = `player-${videoId}-${timestampMs}`

  // Lazy-load: only create IFrame when visible or user clicks
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const startSeconds = Math.floor(timestampMs / 1000)

  return (
    <div className="video-context" ref={containerRef}>
      {!show ? (
        <button className="replay-btn" onClick={() => setShow(true)}>
          Play context
        </button>
      ) : (
        <div className="mini-player">
          <div id={playerId} style={{ width: '100%', height: 120 }} />
        </div>
      )}

      {/* Hidden YouTube IFrame API loader — only when visible */}
      {show && (
        <YouTubeLoader
          videoId={videoId}
          playerId={playerId}
          startSeconds={startSeconds}
        />
      )}
    </div>
  )
}

function YouTubeLoader({
  videoId,
  playerId,
  startSeconds,
}: {
  videoId: string
  playerId: string
  startSeconds: number
}) {
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)

      const orig = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        orig?.()
        createPlayer()
      }
    } else {
      createPlayer()
    }

    function createPlayer() {
      new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          start: startSeconds,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
      })
    }

    return () => {
      loadedRef.current = false
    }
  }, [videoId, playerId, startSeconds])

  return null
}

// Global YT type
declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | null
    YT: any
  }
}

function TrainingPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [mode, setMode] = useState<'flashcard' | 'quiz'>('flashcard')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [finished, setFinished] = useState(false)
  const [results, setResults] = useState({ correct: 0, total: 0 })
  const [quizOptions, setQuizOptions] = useState<string[]>([])
  const [quizCorrect, setQuizCorrect] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/training/due')
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || [])
        setLoading(false)
      })
  }, [])

  const submitReview = async (cardId: number, correct: boolean, quality: number) => {
    await fetch('/api/training/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cardId, correct, quality }),
    })
    setResults((r) => ({
      correct: r.correct + (correct ? 1 : 0),
      total: r.total + 1,
    }))
  }

  const handleFlashcard = async (correct: boolean) => {
    await submitReview(cards[index].id, correct, correct ? 4 : 1)
    nextCard()
  }

  const nextCard = () => {
    setFlipped(false)
    setQuizCorrect(null)
    if (index + 1 >= cards.length) {
      setFinished(true)
    } else {
      setIndex(index + 1)
    }
  }

  const handleQuizStart = () => {
    const card = cards[index]
    const distractors = cards
      .filter((c) => c.id !== card.id && c.wp_type === card.wp_type)
      .slice(0, 3)
      .map((c) => c.text)
    while (distractors.length < 3) distractors.push('???')
    setQuizOptions([card.text, ...distractors].sort(() => Math.random() - 0.5))
  }

  const handleQuizAnswer = async (answer: string) => {
    const card = cards[index]
    const correct = answer === card.text
    setQuizCorrect(correct ? 1 : 0)
    await submitReview(card.id, correct, correct ? 4 : 1)
  }

  if (loading) return <div className="training-page">Loading...</div>
  if (cards.length === 0)
    return (
      <div className="training-page">
        <h2>Training</h2>
        <p>No cards due for review.</p>
      </div>
    )

  if (finished) {
    return (
      <div className="training-page">
        <h2>Session Complete</h2>
        <div className="summary">
          <p>Accuracy: {results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0}%</p>
          <p>Cards reviewed: {results.total}</p>
          <p>Correct: {results.correct}</p>
          <p>Incorrect: {results.total - results.correct}</p>
        </div>
      </div>
    )
  }

  const card = cards[index]

  return (
    <div className="training-page">
      <h2>Training</h2>

      <div className="mode-toggle">
        <button onClick={() => setMode('flashcard')} className={mode === 'flashcard' ? 'active' : ''}>
          Flashcards
        </button>
        <button onClick={() => setMode('quiz')} className={mode === 'quiz' ? 'active' : ''}>
          Quiz
        </button>
      </div>

      <div className="progress">{index + 1} / {cards.length}</div>

      {/* Video context for current card */}
      {card.video_id && (
        <VideoContext videoId={card.video_id} timestampMs={card.timestamp_ms} />
      )}

      {mode === 'flashcard' && (
        <div className="flashcard">
          <div className={`card ${flipped ? 'flipped' : ''}`} onClick={() => !flipped && setFlipped(true)}>
            <div className="front">
              <span className={`type-badge ${card.wp_type}`}>{card.wp_type}</span>
              <strong>{card.text}</strong>
            </div>
            {flipped && (
              <div className="back">
                <p>{card.sentence.replace(card.text, '___')}</p>
                <div className="actions">
                  <button onClick={() => handleFlashcard(false)}>Hard</button>
                  <button onClick={() => handleFlashcard(true)}>Easy</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="quiz">
          {quizOptions.length === 0 ? (
            <div>
              <p className="quiz-sentence">{card.sentence.replace(card.text, '___')}</p>
              <button onClick={handleQuizStart}>Start Quiz</button>
            </div>
          ) : quizCorrect === null ? (
            <div>
              <p className="quiz-sentence">{card.sentence.replace(card.text, '___')}</p>
              <div className="quiz-options">
                {quizOptions.map((opt, i) => (
                  <button key={i} onClick={() => handleQuizAnswer(opt)}>{opt}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className={`quiz-result ${quizCorrect ? 'correct' : 'incorrect'}`}>
              <p>{quizCorrect ? 'Correct!' : 'Incorrect'}</p>
              <p>The answer is: <strong>{card.text}</strong></p>
              <button onClick={nextCard}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TrainingPage
