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
      const ctx = canvas.getContext('2d')!
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: ctx, viewport }).promise

      // Render text layer
      const textLayer = textLayerRef.current
      textLayer.innerHTML = ''
      textLayer.style.width = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`

      const textContent = await page.getTextContent()
      pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport,
        textDivs: [],
      })
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
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onPointerUp={handlePointerUp}
        />
      </div>
    </div>
  )
}

export default PdfViewer
