import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEntities } from '../api'
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

  const totalPages = Math.max(1, Math.ceil(total / 15))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Entities</h1>
          <p className="subtitle">{total} entities from multiple GIS sources</p>
        </div>
      </div>

      <div className="filters">
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

      {error && <div className="banner banner-error">{error}</div>}
      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No entities found. Load sample data from the Dashboard.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Predicted type</th>
                <th>Confidence</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entity) => (
                <tr key={entity.id}>
                  <td>
                    <Link to={`/entities/${entity.id}`}>{entity.name}</Link>
                  </td>
                  <td>{sourceLabel(entity.source)}</td>
                  <td>
                    <code>{entity.predicted_type ?? '—'}</code>
                  </td>
                  <td>
                    {entity.confidence != null ? `${Math.round(entity.confidence * 100)}%` : '—'}
                  </td>
                  <td>{feedbackBadge(entity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
