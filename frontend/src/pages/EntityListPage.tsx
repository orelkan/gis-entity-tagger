import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEntities } from '../api'
import { EntitiesMap } from '../components/EntitiesMap'
import type { EntitySummary } from '../types'

const SOURCES = ['', 'google_places_csv', 'osm_export', 'municipal_gis']

function sourceLabel(source: string) {
  return source.replace(/_/g, ' ')
}

function feedbackBadge(entity: EntitySummary) {
  if (!entity.has_feedback) return <span className="badge badge-muted">Pending</span>
  if (entity.feedback_correct) return <span className="badge badge-ok">Correct</span>
  return <span className="badge badge-warn">Corrected</span>
}

export function EntityListPage() {
  const [items, setItems] = useState<EntitySummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [source, setSource] = useState('')
  const [search, setSearch] = useState('')
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    const hasFeedback =
      feedbackFilter === 'pending' ? false : feedbackFilter === 'reviewed' ? true : undefined

    fetchEntities({
      page,
      page_size: 15,
      source: source || undefined,
      has_feedback: hasFeedback,
      search: search || undefined,
    })
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, source, search, feedbackFilter])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const selectedEntity = items.find((e) => e.id === selectedId) ?? null
  const totalPages = Math.max(1, Math.ceil(total / 15))

  return (
    <div className="entities-shell">
      {/* Sidebar */}
      <div className="entities-sidebar">
        <div className="sidebar-header">
          <h1>Entities</h1>
          <p className="subtitle">{total} entities</p>
        </div>

        <div className="sidebar-filters">
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value)
              setPage(1)
            }}
          >
            {SOURCES.map((s) => (
              <option key={s || 'all'} value={s}>
                {s ? sourceLabel(s) : 'All sources'}
              </option>
            ))}
          </select>
          <select
            value={feedbackFilter}
            onChange={(e) => {
              setFeedbackFilter(e.target.value as typeof feedbackFilter)
              setPage(1)
            }}
          >
            <option value="all">All review status</option>
            <option value="pending">Pending review</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>

        {error && (
          <div className="banner banner-error" style={{ margin: '0.75rem' }}>
            {error}
          </div>
        )}

        <div className="entity-list">
          {loading ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No entities found. Load sample data from the Dashboard.
            </p>
          ) : (
            items.map((entity) => (
              <div
                key={entity.id}
                ref={entity.id === selectedId ? selectedRef : undefined}
                className={`entity-row${entity.id === selectedId ? ' selected' : ''}`}
                onClick={() => setSelectedId(entity.id === selectedId ? null : entity.id)}
              >
                <span className="entity-row-name">{entity.name}</span>
                <div className="entity-row-meta">
                  <span>{sourceLabel(entity.source)}</span>
                  {feedbackBadge(entity)}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedEntity && (
          <div className="sidebar-detail">
            <h3>{selectedEntity.name}</h3>
            <div className="sidebar-detail-row">
              <span>Source</span>
              <span>{sourceLabel(selectedEntity.source)}</span>
            </div>
            {selectedEntity.predicted_type && (
              <div className="sidebar-detail-row">
                <span>Type</span>
                <span>
                  <code>{selectedEntity.predicted_type}</code>
                </span>
              </div>
            )}
            {selectedEntity.confidence != null && (
              <div className="sidebar-detail-row">
                <span>Confidence</span>
                <span>{Math.round(selectedEntity.confidence * 100)}%</span>
              </div>
            )}
            <div className="sidebar-detail-row">
              <span>Review</span>
              <span>{feedbackBadge(selectedEntity)}</span>
            </div>
            <Link to={`/entities/${selectedEntity.id}`} className="sidebar-detail-link">
              View full detail →
            </Link>
          </div>
        )}

        {totalPages > 1 && (
          <div className="sidebar-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="entities-map-wrap">
        <EntitiesMap entities={items} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  )
}
