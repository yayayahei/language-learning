import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import PdfViewer from '../components/PdfViewer'
import SelectionMenu from '../components/SelectionMenu'

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

  // Fetch saved position or use query param
  useEffect(() => {
    if (pdfId) {
      if (pageParam) {
        setInitialPage(parseInt(pageParam, 10) || 1)
      } else {
        fetch(`/api/pdfs/${pdfId}/position`)
          .then((r) => r.json())
          .then((data) => {
            setInitialPage(data.last_page || 1)
          })
          .catch(() => setInitialPage(1))
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

  const handlePageChange = (pageNum: number) => {
    if (!pdfId) return
    // Debounce: save position at most once per second
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/pdfs/${pdfId}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pageNum }),
      })
    }, 1000)
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // PDF reader view when a pdfId is selected
  if (pdfId) {
    return (
      <div className="pdf-reader-page">
        <button className="back-btn" onClick={() => navigate('/pdf')}>
          Back to PDFs
        </button>
        <PdfViewer
          url={`/api/pdfs/${pdfId}/file`}
          initialPage={initialPage}
          onSelection={handleSelection}
          onPageChange={handlePageChange}
        />
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
