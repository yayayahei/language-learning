import { useState } from 'react'
import type { OutlineItem } from './PdfViewer'

type Props = {
  outline: OutlineItem[]
  visible: boolean
  onNavigate: (pageNumber: number) => void
  currentPage?: number
}

function CatalogItem({
  item,
  depth,
  onNavigate,
  currentPage,
}: {
  item: OutlineItem
  depth: number
  onNavigate: (pageNumber: number) => void
  currentPage?: number
}) {
  const hasChildren = item.items.length > 0
  const [expanded, setExpanded] = useState(depth < 2)

  return (
    <li className="catalog-item">
      <div
        className={`catalog-row${item.pageNumber === currentPage ? ' active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren && (
          <button
            className="catalog-toggle"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </button>
        )}
        <span
          className={`catalog-title${item.pageNumber ? ' clickable' : ''}`}
          onClick={() => item.pageNumber && onNavigate(item.pageNumber)}
        >
          {item.title}
          {item.pageNumber > 0 && (
            <span className="catalog-page">{item.pageNumber}</span>
          )}
        </span>
      </div>
      {hasChildren && expanded && (
        <ul className="catalog-children">
          {item.items.map((child, i) => (
            <CatalogItem
              key={i}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
              currentPage={currentPage}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function PdfCatalog({ outline, visible, onNavigate, currentPage }: Props) {
  if (!visible) return null

  return (
    <div className="pdf-catalog-panel">
      {outline.length > 0 ? (
        <ul className="catalog-list">
          {outline.map((item, i) => (
            <CatalogItem
              key={i}
              item={item}
              depth={0}
              onNavigate={onNavigate}
              currentPage={currentPage}
            />
          ))}
        </ul>
      ) : (
        <p className="catalog-empty">No table of contents</p>
      )}
    </div>
  )
}

export default PdfCatalog
