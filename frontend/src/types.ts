export interface Geometry {
  type: string
  coordinates: number[] | number[][] | number[][][]
}

export interface NormalizedEntity {
  name: string
  geometry: Geometry | null
  attributes: Record<string, unknown>
  text_context: string
}

export interface TaggingResult {
  standard: string
  predicted_type: string
  confidence: number
  alternatives: string[]
  reasoning: string
}

export interface Feedback {
  correct: boolean
  corrected_type: string | null
  comment: string | null
  created_at: string
}

export interface EntitySummary {
  id: string
  source: string
  name: string
  predicted_type: string | null
  confidence: number | null
  has_feedback: boolean
  feedback_correct: boolean | null
}

export interface EntityDetail {
  id: string
  source: string
  raw: Record<string, unknown>
  normalized: NormalizedEntity
  tagging: TaggingResult | null
  feedback: Feedback | null
  created_at: string
  updated_at: string
}

export interface EntityListResponse {
  items: EntitySummary[]
  total: number
  page: number
  page_size: number
}

export interface StatsResponse {
  total_entities: number
  tagged_entities: number
  with_feedback: number
  correct_feedback: number
  incorrect_feedback: number
}

export interface FeedbackCreate {
  correct: boolean
  corrected_type?: string | null
  comment?: string | null
}
