import { useState, useEffect } from 'react'

type Card = {
  id: number
  text: string
  wp_type: string
  sentence: string
  easiness_factor: number
  interval: number
  repetitions: number
}

function TrainingPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [mode, setMode] = useState<'flashcard' | 'quiz'>('flashcard')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [finished, setFinished] = useState(false)
  const [results, setResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 })
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

    const newResults = {
      correct: results.correct + (correct ? 1 : 0),
      total: results.total + 1,
    }
    setResults(newResults)
  }

  const handleFlashcard = async (correct: boolean) => {
    const card = cards[index]
    await submitReview(card.id, correct, correct ? 4 : 1)
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
    const sentence = card.sentence.replace(card.text, '___')
    // Generate distractors from other cards
    const distractors = cards
      .filter((c) => c.id !== card.id && c.wp_type === card.wp_type)
      .slice(0, 3)
      .map((c) => c.text)

    // Pad with "???" if not enough distractors
    while (distractors.length < 3) distractors.push('???')

    const options = [card.text, ...distractors].sort(() => Math.random() - 0.5)
    setQuizOptions(options)
  }

  const handleQuizAnswer = async (answer: string) => {
    const card = cards[index]
    const correct = answer === card.text
    setQuizCorrect(correct ? 1 : 0)
    await submitReview(card.id, correct, correct ? 4 : 1)
  }

  if (loading) return <div className="training-page">Loading...</div>
  if (cards.length === 0) return <div className="training-page"><h2>Training</h2><p>No cards due for review.</p></div>
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

      <div className="progress">
        {index + 1} / {cards.length}
      </div>

      {mode === 'flashcard' && (
        <div className="flashcard">
          <div className={`card ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(true)}>
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
                  <button key={i} onClick={() => handleQuizAnswer(opt)}>
                    {opt}
                  </button>
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
