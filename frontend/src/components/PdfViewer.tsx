import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type PdfViewerProps = {
  url: string
  initialPage?: number
  onSelection?: (text: string, pageNum: number, x: number, y: number) => void
  onPageChange?: (pageNum: number) => void
}

// Multiply two 3x2 affine transform matrices
function multiplyTransform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

function PdfViewer({ url, initialPage, onSelection, onPageChange }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasScrolledRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange

  // Load the PDF document
  useEffect(() => {
    setLoading(true)
    setError('')
    hasScrolledRef.current = false
    const loadingTask = pdfjsLib.getDocument(url)
    loadingTask.promise
      .then((doc) => {
        setPdf(doc)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load PDF')
        setLoading(false)
      })
  }, [url])

  // Render all pages when PDF loads
  const renderAllPages = useCallback(async () => {
    if (!pdf || !containerRef.current) return

    const container = containerRef.current
    container.innerHTML = ''
    const dpr = window.devicePixelRatio || 1

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // IntersectionObserver: track which page is most visible
    const visiblePages = new Map<number, number>() // pageNum -> ratio
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNum = Number((entry.target as HTMLElement).dataset.pageNum)
          if (pageNum) {
            visiblePages.set(pageNum, entry.intersectionRatio)
          }
        }
        // Find page with highest intersection ratio
        let bestPage = 1
        let bestRatio = 0
        visiblePages.forEach((ratio, pn) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestPage = pn
          }
        })
        if (bestRatio > 0) {
          onPageChangeRef.current?.(bestPage)
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    )

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.5 })

      // Page wrapper
      const pageDiv = document.createElement('div')
      pageDiv.className = 'pdf-page'
      pageDiv.style.position = 'relative'
      pageDiv.style.marginBottom = '12px'
      pageDiv.style.width = `${viewport.width}px`
      pageDiv.style.height = `${viewport.height}px`
      pageDiv.dataset.pageNum = String(i)

      // Canvas for crisp rendering
      const canvas = document.createElement('canvas')
      canvas.style.display = 'block'
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)

      // Text layer for selection
      const textLayer = document.createElement('div')
      textLayer.className = 'pdf-text-layer'
      textLayer.style.position = 'absolute'
      textLayer.style.top = '0'
      textLayer.style.left = '0'
      textLayer.style.width = `${viewport.width}px`
      textLayer.style.height = `${viewport.height}px`
      textLayer.style.userSelect = 'text'

      pageDiv.appendChild(canvas)
      pageDiv.appendChild(textLayer)
      container.appendChild(pageDiv)

      // Observe this page for visibility tracking
      observerRef.current.observe(pageDiv)

      // Render page to canvas
      await page.render({ canvas, viewport }).promise

      // Render text layer
      const textContent = await page.getTextContent()
      for (const item of textContent.items as Array<{
        str: string
        transform: number[]
        width: number
        height: number
      }>) {
        if (!item.str) continue

        const tx = multiplyTransform(viewport.transform, item.transform)
        const fontSize = Math.hypot(tx[0], tx[1])
        const left = tx[4]
        const top = tx[5] - fontSize

        const span = document.createElement('span')
        span.textContent = item.str
        span.style.position = 'absolute'
        span.style.left = `${left}px`
        span.style.top = `${top}px`
        span.style.fontSize = `${fontSize}px`
        span.style.fontFamily = 'serif'
        span.style.color = 'transparent'
        span.style.pointerEvents = 'auto'
        span.dataset.pageNum = String(i)
        textLayer.appendChild(span)
      }
    }
  }, [pdf])

  useEffect(() => {
    if (pdf) {
      renderAllPages()
    }
  }, [pdf, renderAllPages])

  // Scroll to initial page after pages are rendered
  const scrollToPage = useCallback((pageNum: number) => {
    if (pageNum <= 1) return
    const attemptScroll = (retries: number) => {
      const el = containerRef.current?.querySelector(`[data-page-num="${pageNum}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' })
        return
      }
      if (retries > 0) {
        requestAnimationFrame(() => attemptScroll(retries - 1))
      }
    }
    // Retry up to 50 frames (~1 second) until the target page is in the DOM
    attemptScroll(50)
  }, [])

  useEffect(() => {
    if (!loading && initialPage && initialPage > 1 && !hasScrolledRef.current) {
      hasScrolledRef.current = true
      scrollToPage(initialPage)
    }
  }, [loading, initialPage, scrollToPage])

  // Handle text selection across all pages
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!onSelection) return
    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || !sel.toString().trim()) return

      const text = sel.toString().trim()
      if (!text) return

      const range = sel.getRangeAt(0)
      let pageNum = 1
      let node: Node | null = range.startContainer
      while (node) {
        if (node instanceof HTMLElement) {
          const pageEl = node.closest('[data-page-num]')
          if (pageEl) {
            pageNum = Number((pageEl as HTMLElement).dataset.pageNum) || 1
            break
          }
          const num = node.dataset?.pageNum
          if (num) {
            pageNum = Number(num) || 1
            break
          }
        }
        node = node.parentNode
      }

      onSelection(text, pageNum, e.clientX, e.clientY)
    }, 0)
  }

  if (loading) return <div className="pdf-viewer-status">Loading PDF...</div>
  if (error) return <div className="pdf-viewer-status error">{error}</div>

  return (
    <div className="pdf-viewer">
      <p className="pdf-hint">
        Scroll to read. Select any word or phrase to save it.
      </p>
      <div
        ref={containerRef}
        className="pdf-scroll-container"
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}

export default PdfViewer
