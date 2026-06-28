import type {
  EntityDetail,
  EntityListResponse,
  FeedbackCreate,
  StatsResponse,
} from './types'

const BASE = import.meta.env.DEV ? '/api' : ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || response.statusText)
  }
  return response.json() as Promise<T>
}

export function fetchEntities(params: {
  page?: number
  page_size?: number
  source?: string
  has_feedback?: boolean
  search?: string
}): Promise<EntityListResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.page_size) query.set('page_size', String(params.page_size))
  if (params.source) query.set('source', params.source)
  if (params.has_feedback !== undefined) query.set('has_feedback', String(params.has_feedback))
  if (params.search) query.set('search', params.search)
  const qs = query.toString()
  return request(`/entities${qs ? `?${qs}` : ''}`)
}

export function fetchEntity(id: string): Promise<EntityDetail> {
  return request(`/entities/${id}`)
}

export function fetchStats(): Promise<StatsResponse> {
  return request('/entities/stats/summary')
}

export function submitFeedback(id: string, feedback: FeedbackCreate): Promise<EntityDetail> {
  return request(`/entities/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify(feedback),
  })
}

export function retagEntity(id: string): Promise<EntityDetail> {
  return request(`/entities/${id}/tag`, { method: 'POST' })
}

export function ingestSamples(): Promise<{ ingested: number; tagged: number }> {
  return request('/entities/ingest/samples', { method: 'POST' })
}
