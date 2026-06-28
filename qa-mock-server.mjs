import http from 'node:http'

const countries = Array.from({ length: 20 }, (_, index) => ({
  code: index + 1,
  name: ['Pakistan', 'China', 'United Arab Emirates', 'Saudi Arabia', 'Turkey', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'South Africa', 'Egypt', 'Nigeria', 'Australia', 'New Zealand'][index],
  continentName: index < 5 ? 'Asia' : index < 10 ? 'Europe' : index < 13 ? 'North America' : index < 15 ? 'South America' : index < 18 ? 'Africa' : 'Oceania',
}))

const dashboard = {
  totalOrders: 20,
  totalSales: 4052600,
  totalMerchants: 20,
  activeProducts: 16,
  orderStatuses: [
    { status: 'Cancelled', count: 2 },
    { status: 'Completed', count: 8 },
    { status: 'Pending', count: 3 },
    { status: 'Processing', count: 3 },
    { status: 'Shipped', count: 4 },
  ],
  orderActivity: Array.from({ length: 20 }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    orders: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 5, 6, 4, 5, 3, 4, 6, 5, 7, 8][index],
  })),
  recentOrders: [
    { id: 20, userId: 19, userName: 'Chinedu Okafor', status: 'Completed', createdAt: '2026-06-20 12:20:00', totalAmount: 180000 },
    { id: 19, userId: 17, userName: 'Thabo Nkosi', status: 'Shipped', createdAt: '2026-06-19 11:10:00', totalAmount: 192000 },
    { id: 18, userId: 15, userName: 'Mariana Silva', status: 'Pending', createdAt: '2026-06-18 10:00:00', totalAmount: 249600 },
    { id: 17, userId: 13, userName: 'Emma Taylor', status: 'Completed', createdAt: '2026-06-17 09:50:00', totalAmount: 192500 },
    { id: 16, userId: 11, userName: 'Sofia Garcia', status: 'Processing', createdAt: '2026-06-16 16:40:00', totalAmount: 284800 },
  ],
  productStatuses: [
    { id: 10, merchantId: 10, merchantName: 'Iberia Bulk Goods', name: 'Ceramic Dinnerware Set', price: 16800, status: 'Out of Stock', createdAt: '2026-03-19 12:30:00' },
    { id: 18, merchantId: 18, merchantName: 'Lagos Supply House', name: 'Shea Butter Case', price: 10400, status: 'Out of Stock', createdAt: '2026-03-27 16:30:00' },
    { id: 5, merchantId: 5, merchantName: 'Anatolia Distributors', name: 'Cotton Towels Bundle', price: 6400, status: 'Inactive', createdAt: '2026-03-14 10:00:00' },
    { id: 13, merchantId: 13, merchantName: 'Aztec Wholesale', name: 'Avocado Oil Bottles', price: 11600, status: 'Inactive', createdAt: '2026-03-22 14:00:00' },
    { id: 4, merchantId: 4, merchantName: 'Arabia Trade House', name: 'Arabica Coffee Beans 10kg', price: 18500, status: 'Active', createdAt: '2026-03-13 09:30:00' },
  ],
}

http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Access-Control-Allow-Origin', '*')
  if (request.url === '/api/dashboard') {
    response.end(JSON.stringify(dashboard))
    return
  }
  if (request.url === '/api/countries') {
    response.end(JSON.stringify(countries))
    return
  }
  response.statusCode = 200
  response.end('[]')
}).listen(5094, '127.0.0.1')
