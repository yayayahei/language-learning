import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

type PdfViewerProps = {
  url: string
  onSelection?: (text: string, pageNum: number, x: number, y: number) => void
}

function PdfViewer({ url, onSelection }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [jumpInput, setJumpInput] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const loadingTask = pdfjsLib.getDocument(url)
    loadingTask.promise
      .then((doc) => {
        setPdf(doc)
        setTotalPages(doc.numPages)
        setPageNum(1)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load PDF')
        setLoading(false)
      })
  }, [url])

  const renderPage = useCallback(
    async (num: number) => {
      if (!pdf || !canvasRef.current || !textLayerRef.current) return

      const page = await pdf.getPage(num)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!

      await page.render({ canvas, canvasContext: ctx, viewport }).promise

      // Manual text layer for text selection
      const textLayer = textLayerRef.current
      textLayer.innerHTML = ''
      textLayer.style.width = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`
      textLayer.style.position = 'absolute'
      textLayer.style.top = '0'
      textLayer.style.left = '0'

      const textContent = await page.getTextContent()
      const { items } = textContent as { items: Array<{ str: string; transform: number[]; width: number; height: number }> }

      for (const item of items) {
        if (!item.str) continue
        const tx = item.transform
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1])
        const x = tx[4]
        const y = tx[5] - fontSize

        const span = document.createElement('span')
        span.textContent = item.str
        span.style.position = 'absolute'
        span.style.left = `${x}px`
        span.style.top = `${viewport.height - y - fontSize}px`
        span.style.fontSize = `${fontSize * 1}px`
        span.style.fontFamily = 'sans-serif'
        span.style.color = 'transparent'
        span.style.whiteSpace = 'pre'
        span.setAttribute('data-text', item.str)
        textLayer.appendChild(span)
      }
    },
    [pdf],
  )

  useEffect(() => {
    renderPage(pageNum)
  }, [pageNum, renderPage])

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!onSelection) return
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || !sel.toString().trim()) return
      const text = sel.toString().trim()
      if (text) {
        onSelection(text, pageNum, e.clientX, e.clientY)
      }
    }, 0)
  }

  const goToPage = (n: number) => {
    if (n >= 1 && n <= totalPages) {
      setPageNum(n)
      setJumpInput('')
    }
  }

  if (loading) return <div className="pdf-viewer-status">Loading PDF...</div>
  if (error) return <div className="pdf-viewer-status error">{error}</div>

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1}>
          Prev
        </button>
        <span>
          Page{' '}
          <input
            type="number"
            value={jumpInput || pageNum}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goToPage(Number(jumpInput))
            }}
            min={1}
            max={totalPages}
            style={{ width: 50 }}
          />{' '}
          / {totalPages}
        </span>
        <button onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= totalPages}>
          Next
        </button>
      </div>

      <div className="pdf-page-container" style={{ position: 'relative' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }} />
        <div
          ref={textLayerRef}
          className="pdf-text-layer"
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  )
}

export default PdfViewer
