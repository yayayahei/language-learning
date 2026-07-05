import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import PdfViewer from '../components/PdfViewer'
import type { OutlineItem } from '../components/PdfViewer'
import PdfToolbar from '../components/PdfToolbar'
import PdfCatalog from '../components/PdfCatalog'
import SelectionMenu from '../components/SelectionMenu'
import FloatingDict from '../components/FloatingDict'

type PdfDoc = {
  id: string
  filename: string
  title: string
  last_page?: number
  created_at: string
}

type Selection = {
  text: string
  x: number
  y: number
  pageNum: number
}

function PdfPage() {
  const { pdfId } = useParams()
  const navigate = useNavigate()
  const [pdfs, setPdfs] = useState<PdfDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [initialPage, setInitialPage] = useState<number | undefined>(undefined)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [catalogVisible, setCatalogVisible] = useState(false)
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined)
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPdfs = () => {
    fetch('/api/pdfs')
      .then((r) => r.json())
      .then((data) => setPdfs(data.pdfs || []))
  }

  useEffect(() => {
    fetchPdfs()
  }, [])

  const [searchParams] = useSearchParams()
  const pageParam = searchParams.get('page')

  // Reset state when switching PDFs
  useEffect(() => {
    setOutline([])
    setCatalogVisible(false)
    setTotalPages(undefined)
    setCurrentPage(undefined)
  }, [pdfId])

  // Fetch saved position or use query param
  useEffect(() => {
    if (pdfId) {
      if (pageParam) {
        setInitialPage(parseInt(pageParam, 10) || 1)
      } else {
        fetch(`/api/pdfs/${pdfId}/position`)
          .then((r) => r.json())
          .then((data) => {
            console.log('[POSITION] fetched for', pdfId, ':', data.last_page)
            setInitialPage(data.last_page || 1)
          })
          .catch((e) => {
            console.error('[POSITION] fetch failed:', e)
            setInitialPage(1)
          })
      }
    } else {
      setInitialPage(undefined)
    }
  }, [pdfId, pageParam])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/pdfs/${id}`, { method: 'DELETE' })
    fetchPdfs()
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploadError('')
    const form = e.currentTarget
    const input = form.file as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/pdfs', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        setUploadError(data.error || 'Upload failed')
      } else {
        const data = await res.json()
        navigate(`/pdf/${data.id}`)
      }
    } catch {
      setUploadError('Upload failed')
    }
    setUploading(false)
  }

  const handleSelection = (text: string, pageNum: number, x: number, y: number) => {
    setSelection({ text, pageNum, x, y })
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const lastPageRef = useRef(0)

  const savePosition = (page: number) => {
    if (!pdfId || page < 1) return
    fetch(`/api/pdfs/${pdfId}/position`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
      keepalive: true,
    })
  }

  const handlePageChange = (pageNum: number) => {
    setCurrentPage(pageNum)
    lastPageRef.current = pageNum
    console.log('[POSITION] pageChange:', pageNum)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      console.log('[POSITION] saving (debounced):', pageNum)
      savePosition(pageNum)
    }, 1000)
  }

  const handleCatalogNavigate = (pageNumber: number) => {
    setTargetPage(pageNumber)
  }

  // Save position on unmount or when pdfId changes
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      // Flush immediately on unmount
      if (lastPageRef.current > 1) {
        const body = JSON.stringify({ page: lastPageRef.current })
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(`/api/pdfs/${pdfId}/position`, blob)
      }
    }
  }, [pdfId])

  // PDF reader view when a pdfId is selected
  if (pdfId) {
    return (
      <div className="pdf-reader-page">
        <button className="pdf-exit-btn" onClick={() => navigate('/')} title="Exit reading">✕</button>
        <div className="pdf-reader-layout">
          <div className="pdf-toolbar-wrap">
            <PdfToolbar
              hasOutline={outline.length > 0}
              catalogVisible={catalogVisible}
              onToggleCatalog={() => setCatalogVisible(!catalogVisible)}
              currentPage={currentPage}
              totalPages={totalPages}
            />
            <PdfCatalog
              outline={outline}
              visible={catalogVisible}
              onNavigate={(page) => {
                handleCatalogNavigate(page)
                setCatalogVisible(false)
              }}
              currentPage={currentPage}
            />
          </div>
          <PdfViewer
            url={`/api/pdfs/${pdfId}/file`}
            initialPage={initialPage}
            targetPage={targetPage}
            onSelection={handleSelection}
            onPageChange={handlePageChange}
            onOutlineLoaded={setOutline}
            onLoaded={setTotalPages}
          />
        </div>
        <FloatingDict pdfId={pdfId} />
        {selection && (
          <SelectionMenu
            text={selection.text}
            x={selection.x}
            y={selection.y}
            pageNum={selection.pageNum}
            pdfId={pdfId}
            onClose={() => setSelection(null)}
          />
        )}
      </div>
    )
  }

  // PDF list view
  return (
    <div className="pdf-page">
      <h2>PDF Documents</h2>

      <form className="upload-form" onSubmit={handleUpload}>
        <input type="file" name="file" accept=".pdf,application/pdf" required />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </button>
        {uploadError && <span className="upload-error">{uploadError}</span>}
      </form>

      <div className="pdf-list">
        {pdfs.map((pdf) => (
          <div key={pdf.id} className="pdf-item" onClick={() => navigate(`/pdf/${pdf.id}`)}>
            <span className="pdf-title">{pdf.title || pdf.filename}</span>
            <span className="pdf-date">{new Date(pdf.created_at).toLocaleDateString()}</span>
            <button className="delete-btn" onClick={(e) => handleDelete(pdf.id, e)}>
              x
            </button>
          </div>
        ))}
        {pdfs.length === 0 && (
          <p className="empty">No PDFs yet. Upload one to get started.</p>
        )}
      </div>
    </div>
  )
}

export default PdfPage
