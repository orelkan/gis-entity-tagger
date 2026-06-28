import { useEffect, useRef, useState } from 'react'
import { fetchEntities } from '../api'
import { EntitiesMap } from '../components/EntitiesMap'
import { EntityDetailModal } from '../components/EntityDetailModal'
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
  const [detailId, setDetailId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    const hasFeedback =
      feedbackFilter === 'pending' ? false : feedbackFilter === 'reviewed' ? true : undefined

    fetchEntities({ page, page_size: 15, source: source || undefined, has_feedback: hasFeedback, search: search || undefined })
      .then((data) => { setItems(data.items); setTotal(data.total) })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, source, search, feedbackFilter, refreshKey])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const totalPages = Math.max(1, Math.ceil(total / 15))

  function openDetail(id: string) {
    setSelectedId(id)
    setDetailId(id)
  }

  return (
    <div className="entities-shell">
      <div className="entities-sidebar">
        <div className="sidebar-header">
          <h1>Entities</h1>
          <p className="subtitle">{total} entities</p>
        </div>

        <div className="sidebar-filters">
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          <div className="sidebar-filters-row">
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }}>
              {SOURCES.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s ? sourceLabel(s) : 'All sources'}
                </option>
              ))}
            </select>
            <select
              value={feedbackFilter}
              onChange={(e) => { setFeedbackFilter(e.target.value as typeof feedbackFilter); setPage(1) }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
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
                onClick={() => openDetail(entity.id)}
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

        {totalPages > 1 && (
          <div className="sidebar-pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <span>{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              →
            </button>
          </div>
        )}
      </div>

      <div className="entities-map-wrap">
        <EntitiesMap
          entities={items}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); setDetailId(id) }}
        />
      </div>

      <EntityDetailModal
        id={detailId}
        onClose={() => setDetailId(null)}
        onFeedbackChange={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
