import { useEffect, useRef, useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type OutlineItem = {
  title: string
  pageNumber: number
  items: OutlineItem[]
}

type PdfViewerProps = {
  url: string
  initialPage?: number
  targetPage?: number
  onSelection?: (text: string, pageNum: number, x: number, y: number) => void
  onPageChange?: (pageNum: number) => void
  onOutlineLoaded?: (outline: OutlineItem[]) => void
  onLoaded?: (numPages: number) => void
}

// Resolve a destination (string name or explicit array) to page number
async function resolveDest(
  pdf: pdfjsLib.PDFDocumentProxy,
  dest: string | Array<any>,
): Promise<number | null> {
  try {
    let explicitDest: Array<any>
    if (typeof dest === 'string') {
      explicitDest = (await pdf.getDestination(dest)) as Array<any>
      if (!explicitDest) return null
    } else {
      explicitDest = dest
    }
    // The page reference is always the first element
    const pageRef = explicitDest[0]
    if (pageRef && typeof pageRef === 'object' && pageRef.num !== undefined) {
      const pageIndex = await pdf.getPageIndex(pageRef)
      return pageIndex + 1
    }
    return null
  } catch {
    return null
  }
}

// Recursively resolve outline items' destinations to page numbers
async function resolveOutline(
  pdf: pdfjsLib.PDFDocumentProxy,
  items: Array<any>,
): Promise<OutlineItem[]> {
  const result: OutlineItem[] = []
  for (const item of items) {
    let pageNumber = 0
    if (item.dest) {
      const pn = await resolveDest(pdf, item.dest)
      if (pn) pageNumber = pn
    }
    const children = item.items?.length
      ? await resolveOutline(pdf, item.items)
      : []
    result.push({ title: item.title, pageNumber, items: children })
  }
  return result
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

function PdfViewer({ url, initialPage, targetPage, onSelection, onPageChange, onOutlineLoaded, onLoaded }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const renderGenRef = useRef(0)
  const scrollToRef = useRef(0)
  const [ready, setReady] = useState(false)
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange

  // Load the PDF document
  useEffect(() => {
    setLoading(true)
    setError('')
    setReady(false)
    scrollToRef.current = 0
    const loadingTask = pdfjsLib.getDocument(url)
    loadingTask.promise
      .then(async (doc) => {
        setPdf(doc)
        setLoading(false)
        console.log('[POSITION] PDF loaded, pages:', doc.numPages)
        onLoaded?.(doc.numPages)
        // Extract outline (catalog / table of contents)
        if (onOutlineLoaded) {
          try {
            const rawOutline = await doc.getOutline()
            if (rawOutline?.length) {
              const resolved = await resolveOutline(doc, rawOutline)
              onOutlineLoaded(resolved)
            } else {
              onOutlineLoaded([])
            }
          } catch {
            onOutlineLoaded([])
          }
        }
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
    const containerWidth = container.clientWidth
    // Store the page to scroll to after all pages render
    const target = scrollToRef.current
    console.log('[POSITION] renderAllPages start, gen:', renderGenRef.current + 1, 'target:', target)
    container.innerHTML = ''
    const gen = ++renderGenRef.current
    const dpr = window.devicePixelRatio || 1

    // Calculate scale to fit container width
    const basePage = await pdf.getPage(1)
    const baseViewport = basePage.getViewport({ scale: 1.0 })
    const fitScale = containerWidth / baseViewport.width

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
      // Abort if a newer render pass has started
      if (renderGenRef.current !== gen) return
      const page = await pdf.getPage(i)
      if (renderGenRef.current !== gen) return
      const viewport = page.getViewport({ scale: fitScale })

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
      const styles: Record<string, { ascent: number; descent: number }> =
        (textContent as any).styles || {}
      const scale = viewport.transform[0]

      // Resolve text items with their viewport positions, then sort by
      // reading order so the browser's double-click word selection matches
      // the visual layout instead of internal PDF rendering order.
      interface ResolvedItem {
        str: string
        left: number
        top: number
        right: number
        fontHeight: number
      }
      const resolved: ResolvedItem[] = []
      for (const item of textContent.items as Array<{
        str: string
        transform: number[]
        width: number
        height: number
        fontName?: string
      }>) {
        if (!item.str) continue
        const tx = multiplyTransform(viewport.transform, item.transform)
        const fontHeight = Math.hypot(tx[2], tx[3])
        const left = tx[4]
        const st = item.fontName ? styles[item.fontName] : null
        const ascentRatio = st ? st.ascent / (st.ascent + Math.abs(st.descent)) : 0.8
        const top = tx[5] - fontHeight * ascentRatio
        const right = left + item.width * scale
        resolved.push({ str: item.str, left, top, right, fontHeight })
      }

      // Sort by line (top) then by column (left) for visual reading order
      resolved.sort((a, b) => {
        const lineDiff = a.top - b.top
        if (Math.abs(lineDiff) > a.fontHeight * 0.3) return lineDiff
        return a.left - b.left
      })

      let prevRight = 0
      let prevTop = 0
      let prevFontHeight = 0
      let prevStr = ''
      for (const item of resolved) {
        // Insert space between words when a visual gap exists
        const sameLine = prevStr && Math.abs(item.top - prevTop) < prevFontHeight * 0.3
        const gap = item.left - prevRight
        if (sameLine && gap > item.fontHeight * 0.3 && !prevStr.endsWith(' ') && !item.str.startsWith(' ')) {
          const spaceSpan = document.createElement('span')
          spaceSpan.textContent = ' '
          spaceSpan.style.position = 'absolute'
          spaceSpan.style.left = `${prevRight}px`
          spaceSpan.style.top = `${prevTop}px`
          spaceSpan.style.fontSize = `${prevFontHeight}px`
          spaceSpan.style.fontFamily = 'serif'
          spaceSpan.style.color = 'transparent'
          spaceSpan.style.pointerEvents = 'auto'
          spaceSpan.dataset.pageNum = String(i)
          textLayer.appendChild(spaceSpan)
        }

        prevRight = item.right
        prevTop = item.top
        prevFontHeight = item.fontHeight
        prevStr = item.str

        const span = document.createElement('span')
        span.textContent = item.str
        span.style.position = 'absolute'
        span.style.left = `${item.left}px`
        span.style.top = `${item.top}px`
        span.style.fontSize = `${item.fontHeight}px`
        span.style.fontFamily = 'serif'
        span.style.color = 'transparent'
        span.style.pointerEvents = 'auto'
        span.dataset.pageNum = String(i)
        textLayer.appendChild(span)
      }
    }

    // Scroll to saved position after all pages are rendered
    if (target > 1 && renderGenRef.current === gen) {
      const el = container.querySelector(`[data-page-num="${target}"]`)
      console.log('[POSITION] renderAllPages end, target:', target, 'found:', !!el, 'gen:', gen)
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' })
        console.log('[POSITION] scrolled to page:', target)
        scrollToRef.current = 0
      }
    } else if (target <= 1) {
      console.log('[POSITION] renderAllPages end, no target, gen:', gen)
    }
    setReady(true)
  }, [pdf])

  // Track initialPage for scroll-after-render
  const initialPageRef = useRef(initialPage)
  useEffect(() => {
    console.log('[POSITION] PdfViewer initialPage effect:', initialPage, 'prev:', initialPageRef.current)
    if (initialPage && initialPage > 1 && initialPage !== initialPageRef.current) {
      initialPageRef.current = initialPage
      scrollToRef.current = initialPage
      console.log('[POSITION] scrollToRef set to:', initialPage)
      if (containerRef.current?.children.length) {
        const el = containerRef.current.querySelector(`[data-page-num="${initialPage}"]`)
        console.log('[POSITION] pages exist, scrolling now, found el:', !!el)
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
      } else {
        console.log('[POSITION] no pages yet, will scroll after render')
      }
    }
  }, [initialPage])

  // Track targetPage for catalog navigation
  const targetPageRef = useRef(targetPage)
  useEffect(() => {
    if (targetPage && targetPage !== targetPageRef.current) {
      targetPageRef.current = targetPage
      scrollToRef.current = targetPage
      if (containerRef.current?.children.length) {
        const el = containerRef.current.querySelector(`[data-page-num="${targetPage}"]`)
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
      }
    }
  }, [targetPage])

  useEffect(() => {
    if (pdf) {
      renderAllPages()
    }
  }, [pdf, renderAllPages])

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
        className={`pdf-scroll-container${ready ? ' pdf-ready' : ''}`}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}

export default PdfViewer
