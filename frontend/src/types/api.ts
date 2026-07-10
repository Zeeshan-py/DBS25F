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
  totalCustomers: number
  totalProducts: number
  totalCountries: number
  pendingOrders: number
  completedOrders: number
  recentOrders: Order[]
  productStatuses: Product[]
  productStatusCounts: ProductStatusCount[]
  topCustomers: TopCustomer[]
  salesByCountry: SalesByCountry[]
  merchantSales: MerchantSales[]
}

export interface ProductStatusCount {
  status: string
  count: number
}

export interface TopCustomer {
  userId: number
  fullName: string
  orderCount: number
  totalSpent: number
}

export interface SalesByCountry {
  countryName: string
  orderCount: number
  totalSales: number
}

export interface MerchantSales {
  merchantId: number
  merchantName: string
  productCount: number
  totalSales: number
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
