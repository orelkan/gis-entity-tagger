import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchStats, ingestSamples } from '../api'
import type { StatsResponse } from '../types'

export function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetchStats()
      .then(setStats)
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSeed = async () => {
    setSeeding(true)
    setMessage(null)
    try {
      const result = await ingestSamples()
      setMessage(`Loaded ${result.ingested} sample entities (${result.tagged} tagged).`)
      load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load samples')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Review LLM-assigned Google Place types for GIS entities.</p>
        </div>
        <button type="button" onClick={handleSeed} disabled={seeding}>
          {seeding ? 'Loading…' : 'Load sample data'}
        </button>
      </div>

      {message && <div className="banner">{message}</div>}

      {loading ? (
        <p>Loading stats…</p>
      ) : stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total_entities}</span>
            <span className="stat-label">Total entities</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.tagged_entities}</span>
            <span className="stat-label">Tagged</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.with_feedback}</span>
            <span className="stat-label">Reviewed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.correct_feedback}</span>
            <span className="stat-label">Marked correct</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.incorrect_feedback}</span>
            <span className="stat-label">Corrections</span>
          </div>
        </div>
      ) : null}

      <p className="hint">
        <Link to="/entities">Browse entities →</Link>
      </p>
    </div>
  )
}
