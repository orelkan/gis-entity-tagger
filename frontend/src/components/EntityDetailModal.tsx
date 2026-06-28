import { useEffect, useState } from 'react'
import { fetchEntity, retagEntity, submitFeedback } from '../api'
import { EntityMap } from './EntityMap'
import type { EntityDetail } from '../types'

const GOOGLE_TYPES = [
  'restaurant', 'cafe', 'bar', 'bakery', 'supermarket',
  'grocery_or_supermarket', 'convenience_store', 'store',
  'hospital', 'doctor', 'pharmacy', 'school', 'university',
  'library', 'park', 'museum', 'parking', 'lodging', 'hotel',
  'bank', 'gas_station', 'church', 'point_of_interest',
]

interface Props {
  id: string | null
  onClose: () => void
  onFeedbackChange: () => void
}

export function EntityDetailModal({ id, onClose, onFeedbackChange }: Props) {
  const [entity, setEntity] = useState<EntityDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [correctedType, setCorrectedType] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retagging, setRetagging] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) { setEntity(null); return }
    setLoading(true)
    setError(null)
    setSaved(false)
    fetchEntity(id)
      .then((data) => {
        setEntity(data)
        setCorrect(data.feedback?.correct ?? null)
        setCorrectedType(data.feedback?.corrected_type ?? '')
        setComment(data.feedback?.comment ?? '')
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!id) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || correct === null) return
    setSubmitting(true)
    setError(null)
    try {
      const updated = await submitFeedback(id, {
        correct,
        corrected_type: correct ? null : correctedType,
        comment: comment || null,
      })
      setEntity(updated)
      setSaved(true)
      onFeedbackChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetag = async () => {
    if (!id) return
    setRetagging(true)
    setError(null)
    try {
      const updated = await retagEntity(id)
      setEntity(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-tag')
    } finally {
      setRetagging(false)
    }
  }

  const attributes = entity ? Object.entries(entity.normalized.attributes) : []

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {loading ? 'Loading…' : (entity?.normalized.name ?? '—')}
            </h2>
            {entity && (
              <p className="subtitle">{entity.source.replace(/_/g, ' ')}</p>
            )}
          </div>
          <div className="modal-actions">
            {entity && (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleRetag}
                disabled={retagging}
              >
                {retagging ? 'Re-tagging…' : 'Re-tag'}
              </button>
            )}
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="banner banner-error" style={{ margin: '0 1.25rem' }}>
            {error}
          </div>
        )}

        {entity && (
          <div className="modal-body">
            {/* Left: map + original source data */}
            <div className="modal-left">
              <EntityMap
                geometry={entity.normalized.geometry}
                name={entity.normalized.name}
                predictedType={entity.tagging?.predicted_type}
                height="190px"
              />

              <div className="source-data">
                <p className="source-data-label">Original data</p>

                {entity.normalized.text_context && (
                  <p className="text-context">{entity.normalized.text_context}</p>
                )}

                {attributes.length > 0 && (
                  <table className="attr-table">
                    <tbody>
                      {attributes.map(([k, v]) => (
                        <tr key={k}>
                          <td className="attr-key">{k}</td>
                          <td className="attr-val">{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right: tagging + feedback */}
            <div className="modal-right">
              {entity.tagging ? (
                <div className="tagging-block">
                  <div className="predicted-type">{entity.tagging.predicted_type}</div>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {Math.round(entity.tagging.confidence * 100)}% confidence
                  </p>
                  {entity.tagging.reasoning && (
                    <p className="reasoning" style={{ marginTop: '0.4rem' }}>
                      {entity.tagging.reasoning}
                    </p>
                  )}
                  {entity.tagging.alternatives.length > 0 && (
                    <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Alternatives:{' '}
                      {entity.tagging.alternatives.map((t) => (
                        <code key={t} style={{ marginRight: '0.3rem' }}>{t}</code>
                      ))}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Not tagged yet.</p>
              )}

              <form onSubmit={handleSubmit} className="feedback-form">
                <div className="radio-row">
                  <label>
                    <input
                      type="radio"
                      name="correct"
                      checked={correct === true}
                      onChange={() => { setCorrect(true); setSaved(false) }}
                    />
                    Correct
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="correct"
                      checked={correct === false}
                      onChange={() => { setCorrect(false); setSaved(false) }}
                    />
                    Should be different
                  </label>
                </div>

                {correct === false && (
                  <select
                    value={correctedType}
                    onChange={(e) => setCorrectedType(e.target.value)}
                    required
                  >
                    <option value="">Select correct type…</option>
                    {GOOGLE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}

                <textarea
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setSaved(false) }}
                  rows={2}
                  placeholder="Comment (optional)"
                />

                <div className="feedback-form-footer">
                  <button type="submit" disabled={submitting || correct === null}>
                    {submitting ? 'Saving…' : 'Submit feedback'}
                  </button>
                  {saved && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--badge-ok-fg)' }}>Saved</span>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
