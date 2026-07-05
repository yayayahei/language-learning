import { useState } from 'react'

type Props = {
  hasOutline: boolean
  catalogVisible: boolean
  onToggleCatalog: () => void
  currentPage?: number
  totalPages?: number
}

function PdfToolbar({ hasOutline, catalogVisible, onToggleCatalog, currentPage, totalPages }: Props) {
  const [hidden, setHidden] = useState(false)

  if (hidden) {
    return (
      <button
        className="pdf-toolbar-restore"
        onClick={() => setHidden(false)}
        aria-label="Show toolbar"
      >
        +
      </button>
    )
  }

  return (
    <div className="pdf-toolbar">
      <button
        className="pdf-toolbar-btn pdf-toolbar-hide"
        onClick={() => setHidden(true)}
        aria-label="Hide toolbar"
      >
        {'\u25B4'}
      </button>
      <div className="pdf-toolbar-left">
        {totalPages && (
          <span className="pdf-toolbar-info">
            Page {currentPage || 1} / {totalPages}
          </span>
        )}
        {hasOutline && (
          <button
            className={`pdf-toolbar-btn${catalogVisible ? ' active' : ''}`}
            onClick={onToggleCatalog}
          >
            {catalogVisible ? '\u2715' : '\u2630'} Catalog
          </button>
        )}
      </div>
    </div>
  )
}

export default PdfToolbar
