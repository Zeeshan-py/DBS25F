export type Primitive = string | number
export type ApiRecord = Record<string, Primitive>

export interface Country {
  code: number
  name: string
  continentName: string
}

export interface User {
  id: number
  fullName: string
  email: string
  gender: string
  dateOfBirth: string
  countryCode: number
  countryName: string
  createdAt: string
}

export interface Merchant {
  id: number
  merchantName: string
  adminId: number
  adminName: string
  countryCode: number
  countryName: string
  createdAt: string
}

export interface Product {
  id: number
  merchantId: number
  merchantName: string
  name: string
  price: number
  status: string
  createdAt: string
}

export interface Order {
  id: number
  userId: number
  userName: string
  status: string
  createdAt: string
  totalAmount: number
}

export interface OrderItem {
  orderId: number
  customerName: string
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface DashboardSummary {
  totalOrders: number
  totalSales: number
  totalMerchants: number
  activeProducts: number
  recentOrders: Order[]
  productStatuses: Product[]
}

export interface SelectOption {
  value: Primitive
  label: string
}

export interface ReferenceSource {
  endpoint: string
  valueKey: string
  labelKey: string
  prefix?: string
}

export interface FormField {
  key: string
  label: string
  type: 'text' | 'email' | 'number' | 'date' | 'select'
  required?: boolean
  min?: number
  max?: number
  placeholder?: string
  options?: SelectOption[]
  reference?: ReferenceSource
}

export interface TableColumn {
  key: string
  label: string
  format?: (value: Primitive, row: ApiRecord) => string
}

export interface EntityConfig {
  path: string
  endpoint: string
  singular: string
  plural: string
  description: string
  keyFields: string[]
  columns: TableColumn[]
  fields: FormField[]
  getKeyPath: (row: ApiRecord) => string
}
