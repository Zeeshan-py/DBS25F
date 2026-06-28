import axios from 'axios'
import type { ApiRecord, DashboardSummary } from '../types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const apiService = {
  getAll: async <T = ApiRecord>(endpoint: string): Promise<T[]> => {
    const response = await api.get<T[]>(endpoint)
    return response.data
  },

  getDashboard: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>('/dashboard')
    return response.data
  },

  create: async <T = ApiRecord>(endpoint: string, payload: ApiRecord): Promise<T> => {
    const response = await api.post<T>(endpoint, payload)
    return response.data
  },

  update: async <T = ApiRecord>(
    endpoint: string,
    keyPath: string,
    payload: ApiRecord,
  ): Promise<T> => {
    const response = await api.put<T>(`${endpoint}/${keyPath}`, payload)
    return response.data
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
