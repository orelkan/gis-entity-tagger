import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEntity, retagEntity, submitFeedback } from '../api'
import { EntityMap } from '../components/EntityMap'
import type { EntityDetail } from '../types'

const GOOGLE_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'supermarket',
  'grocery_or_supermarket',
  'convenience_store',
  'store',
  'hospital',
  'doctor',
  'pharmacy',
  'school',
  'university',
  'library',
  'park',
  'museum',
  'parking',
  'lodging',
  'hotel',
  'bank',
  'gas_station',
  'church',
  'point_of_interest',
]

export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [entity, setEntity] = useState<EntityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [correctedType, setCorrectedType] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retagging, setRetagging] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    fetchEntity(id)
      .then((data) => {
        setEntity(data)
        if (data.feedback) {
          setCorrect(data.feedback.correct)
          setCorrectedType(data.feedback.corrected_type ?? '')
          setComment(data.feedback.comment ?? '')
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || correct === null) return
    if (!correct && !correctedType) {
      setError('Select a corrected type when marking incorrect.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const updated = await submitFeedback(id, {
        correct,
        corrected_type: correct ? null : correctedType,
        comment: comment || null,
      })
      setEntity(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
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

  if (loading) return <p>Loading entity…</p>
  if (!entity) return <p>{error ?? 'Entity not found.'}</p>

  return (
    <div className="page">
      <Link to="/entities" className="back-link">
        ← Back to list
      </Link>

      <div className="page-header">
        <div>
          <h1>{entity.normalized.name}</h1>
          <p className="subtitle">Source: {entity.source.replace(/_/g, ' ')}</p>
        </div>
        <button type="button" onClick={handleRetag} disabled={retagging}>
          {retagging ? 'Re-tagging…' : 'Re-run tagging'}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="detail-grid">
        <section className="panel">
          <h2>Map</h2>
          <EntityMap
            geometry={entity.normalized.geometry}
            name={entity.normalized.name}
            predictedType={entity.tagging?.predicted_type}
          />
        </section>

        <section className="panel">
          <h2>Tagged type (Google Places)</h2>
          {entity.tagging ? (
            <div className="tagging-block">
              <div className="predicted-type">{entity.tagging.predicted_type}</div>
              <p>Confidence: {Math.round(entity.tagging.confidence * 100)}%</p>
              <p className="reasoning">{entity.tagging.reasoning}</p>
              {entity.tagging.alternatives.length > 0 && (
                <p>
                  Alternatives:{' '}
                  {entity.tagging.alternatives.map((t) => (
                    <code key={t} className="alt-tag">
                      {t}
                    </code>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <p>Not tagged yet.</p>
          )}
        </section>

        <section className="panel">
          <h2>Original data</h2>
          <pre className="json-block">{JSON.stringify(entity.raw, null, 2)}</pre>
        </section>

        <section className="panel">
          <h2>Normalized</h2>
          <pre className="json-block">{JSON.stringify(entity.normalized, null, 2)}</pre>
        </section>
      </div>

      <section className="panel feedback-panel">
        <h2>Your feedback</h2>
        {entity.feedback && (
          <p className="feedback-status">
            Previously submitted: {entity.feedback.correct ? 'Correct' : `Incorrect → ${entity.feedback.corrected_type}`}
          </p>
        )}
        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="radio-row">
            <label>
              <input
                type="radio"
                name="correct"
                checked={correct === true}
                onChange={() => setCorrect(true)}
              />
              Type is correct
            </label>
            <label>
              <input
                type="radio"
                name="correct"
                checked={correct === false}
                onChange={() => setCorrect(false)}
              />
              Type should be different
            </label>
          </div>

          {correct === false && (
            <label>
              Correct type
              <select value={correctedType} onChange={(e) => setCorrectedType(e.target.value)} required>
                <option value="">Select type…</option>
                {GOOGLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Comment (optional)
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </label>

          <button type="submit" disabled={submitting || correct === null}>
            {submitting ? 'Saving…' : 'Submit feedback'}
          </button>
        </form>
      </section>
    </div>
  )
}
