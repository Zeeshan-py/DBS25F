import axios from 'axios'
import type { ApiRecord, DashboardSummary } from '../types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function toCamelCase(key: string) {
  const withoutUnderscores = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
  return withoutUnderscores.charAt(0).toLowerCase() + withoutUnderscores.slice(1)
}

function normalizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeKeys)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [toCamelCase(key), normalizeKeys(item)]),
    )
  }
  return value
}

function normalizeList<T>(value: unknown): T[] {
  const normalized = normalizeKeys(value)
  if (Array.isArray(normalized)) return normalized as T[]

  const wrapped = normalized as { $values?: unknown } | null
  if (wrapped && Array.isArray(wrapped.$values)) return wrapped.$values as T[]

  throw new Error('The API returned an invalid list response.')
}

export const apiService = {
  getAll: async <T = ApiRecord>(endpoint: string): Promise<T[]> => {
    const response = await api.get<unknown>(endpoint)
    return normalizeList<T>(response.data)
  },

  getDashboard: async (): Promise<DashboardSummary> => {
    const response = await api.get<unknown>('/dashboard')
    return normalizeKeys(response.data) as DashboardSummary
  },

  create: async <T = ApiRecord>(endpoint: string, payload: ApiRecord): Promise<T> => {
    const response = await api.post<unknown>(endpoint, payload)
    return normalizeKeys(response.data) as T
  },

  update: async <T = ApiRecord>(
    endpoint: string,
    keyPath: string,
    payload: ApiRecord,
  ): Promise<T> => {
    const response = await api.put<unknown>(`${endpoint}/${keyPath}`, payload)
    return normalizeKeys(response.data) as T
  },

  remove: async (endpoint: string, keyPath: string): Promise<void> => {
    await api.delete(`${endpoint}/${keyPath}`)
  },
}

interface ProblemResponse {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

export function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ProblemResponse>(error)) {
    return 'An unexpected error occurred.'
  }

  const problem = error.response?.data
  if (problem?.errors) {
    const firstMessage = Object.values(problem.errors).flat()[0]
    if (firstMessage) return firstMessage
  }
  return problem?.detail ?? problem?.title ?? error.message ?? 'The request failed.'
}
