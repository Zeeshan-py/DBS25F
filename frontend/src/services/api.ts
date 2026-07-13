import axios from 'axios'
import type {
  ApiRecord,
  BusinessKpis,
  CalculateOrderTotalRequest,
  CreatedOrder,
  CreateOrderWithItemsRequest,
  DashboardSummary,
  MerchantSales,
  OrderCalculationResult,
  OrderStatusMetric,
  ProductStatusCount,
  SalesByCountry,
  SalesTrendPoint,
  TopCustomer,
  TopMerchantMetric,
  TopProductMetric,
} from '../types/api'

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

function embeddedList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const wrapped = value as { $values?: unknown } | null
  return wrapped && Array.isArray(wrapped.$values) ? wrapped.$values as T[] : []
}

export const apiService = {
  getAll: async <T = ApiRecord>(endpoint: string): Promise<T[]> => {
    const response = await api.get<unknown>(endpoint)
    return normalizeList<T>(response.data)
  },

  getDashboard: async (): Promise<DashboardSummary> => {
    const response = await api.get<unknown>('/dashboard')
    const value = normalizeKeys(response.data) as Partial<DashboardSummary>
    return {
      totalOrders: Number(value.totalOrders ?? 0),
      totalSales: Number(value.totalSales ?? 0),
      totalMerchants: Number(value.totalMerchants ?? 0),
      activeProducts: Number(value.activeProducts ?? 0),
      totalCustomers: Number(value.totalCustomers ?? 0),
      totalProducts: Number(value.totalProducts ?? 0),
      totalCountries: Number(value.totalCountries ?? 0),
      pendingOrders: Number(value.pendingOrders ?? 0),
      completedOrders: Number(value.completedOrders ?? 0),
      recentOrders: embeddedList(value.recentOrders),
      productStatuses: embeddedList(value.productStatuses),
      productStatusCounts: embeddedList(value.productStatusCounts),
      topCustomers: embeddedList(value.topCustomers),
      salesByCountry: embeddedList(value.salesByCountry),
      merchantSales: embeddedList(value.merchantSales),
    }
  },

  getProductStatusReport: async (): Promise<ProductStatusCount[]> => {
    const response = await api.get<unknown>('/reports/product-status')
    return normalizeList<ProductStatusCount>(response.data)
  },

  getTopCustomersReport: async (limit = 10): Promise<TopCustomer[]> => {
    const response = await api.get<unknown>('/reports/top-customers', { params: { limit } })
    return normalizeList<TopCustomer>(response.data)
  },

  getSalesByCountryReport: async (limit = 10): Promise<SalesByCountry[]> => {
    const response = await api.get<unknown>('/reports/sales-by-country', { params: { limit } })
    return normalizeList<SalesByCountry>(response.data)
  },

  getMerchantSalesReport: async (limit = 10): Promise<MerchantSales[]> => {
    const response = await api.get<unknown>('/reports/merchant-sales', { params: { limit } })
    return normalizeList<MerchantSales>(response.data)
  },

  createOrderWithItems: async (payload: CreateOrderWithItemsRequest): Promise<CreatedOrder> => {
    const response = await api.post<unknown>('/orders/with-items', payload)
    return normalizeKeys(response.data) as CreatedOrder
  },

  getBusinessKpis: async (): Promise<BusinessKpis> => {
    const response = await api.get<unknown>('/reports/business-kpis')
    return normalizeKeys(response.data) as BusinessKpis
  },

  getSalesTrend: async (days = 90): Promise<SalesTrendPoint[]> => {
    const response = await api.get<unknown>('/reports/sales-trend', { params: { days } })
    return normalizeList<SalesTrendPoint>(response.data)
  },

  getOrderStatusReport: async (): Promise<OrderStatusMetric[]> => {
    const response = await api.get<unknown>('/reports/order-status')
    return normalizeList<OrderStatusMetric>(response.data)
  },

  getTopProductsReport: async (limit = 10): Promise<TopProductMetric[]> => {
    const response = await api.get<unknown>('/reports/top-products', { params: { limit } })
    return normalizeList<TopProductMetric>(response.data)
  },

  getTopMerchantsReport: async (limit = 10): Promise<TopMerchantMetric[]> => {
    const response = await api.get<unknown>('/reports/top-merchants', { params: { limit } })
    return normalizeList<TopMerchantMetric>(response.data)
  },

  calculateOrderTotal: async (payload: CalculateOrderTotalRequest): Promise<OrderCalculationResult> => {
    const response = await api.post<unknown>('/calculations/order-total', payload)
    return normalizeKeys(response.data) as OrderCalculationResult
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
