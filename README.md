# Wholesale Dealer Database System

A complete Database Systems semester project based on the supplied ERD. It manages countries, users, merchants, products, orders, and order items through a MySQL 8 database, an ASP.NET Core 8 Web API, and a React/Vite administration dashboard.

## Technology

- MySQL 8.0 / InnoDB / `utf8mb4`
- ASP.NET Core 8 Web API
- Entity Framework Core 8 with Pomelo MySQL Provider
- Swagger / OpenAPI
- React 19 + TypeScript + Vite
- Axios, React Router, Recharts, and Lucide icons

## Professional features

- Full CRUD for all six ERD tables with search, filters, sorting, pagination, configurable page size, and spreadsheet-safe CSV export.
- Executive dashboard and analytics workspace with sales trends, fulfillment distribution, product performance, merchant performance, business KPIs, and accessible chart data tables.
- Transactional Sales Order Builder for one customer and multiple unique product lines, including live quantities, line totals, subtotal, server-side price verification, and atomic database persistence.
- Quote Calculator with database-backed product pricing, discount, tax, shipping, subtotal, and grand-total calculations. Results can be printed without modifying the database.
- Business rules that reject unavailable products, duplicate order lines, invalid status transitions, and changes to completed or cancelled order items.
- Form validation, dependent dropdown filtering, modal focus management, keyboard escape/focus trapping, loading states, empty states, retry actions, and delete confirmation.
- Lazy-loaded React routes, responsive layouts, reduced-motion support, configurable display currency, and semantic SVG icons.
- Swagger documentation, configurable CORS, RFC 7807 error responses, DTO validation, async EF Core queries, retry-safe transactions, and database-aware health checks.
- Dockerized MySQL setup with the exact supplied ERD and 20 sample records for every table.
- Repeatable PowerShell smoke tests covering all resources, analytics, quote arithmetic, validation, transactional creation, and cleanup.

## ERD implementation

The source ERD is preserved at [`docs/erd.png`](docs/erd.png). Its six tables and original `int`/`varchar` fields are implemented exactly. The database adds only the requested relational details:

- `countries.code` is the country primary key.
- `users.id`, `merchants.id`, `products.id`, and `orders.id` are auto-increment primary keys.
- `order_items` has the composite primary key `(order_id, product_id)`.
- `users.country_code` and `merchants.country_code` reference `countries.code`.
- `merchants.admin_id` references `users.id`.
- `products.merchant_id` references `merchants.id`.
- `orders.user_id` references `users.id`.
- `order_items.order_id` and `order_items.product_id` reference their parent records.

The ERD declares dates as `varchar`, so the implementation keeps them as strings and validates the sortable formats `YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss`.

## Folder structure

```text
Final Project/
├── database/
│   ├── 01_schema.sql
│   ├── 02_seed.sql
│   ├── 03_reports.sql
│   └── 04_verify.sql
├── backend/
│   └── WholesaleDealer.Api/
│       ├── Controllers/
│       │   ├── CalculationsController.cs
│       │   ├── CountriesController.cs
│       │   ├── DashboardController.cs
│       │   ├── MerchantsController.cs
│       │   ├── OrderItemsController.cs
│       │   ├── OrdersController.cs
│       │   ├── ProductsController.cs
│       │   ├── ReportsController.cs
│       │   └── UsersController.cs
│       ├── Data/WholesaleDealerDbContext.cs
│       ├── Dtos/
│       │   ├── AnalyticsDtos.cs
│       │   ├── CountryDtos.cs
│       │   ├── DashboardDtos.cs
│       │   ├── MerchantDtos.cs
│       │   ├── OrderDtos.cs
│       │   ├── OrderItemDtos.cs
│       │   ├── ProductDtos.cs
│       │   └── UserDtos.cs
│       ├── Infrastructure/Timestamp.cs
│       ├── Middleware/ExceptionHandlingMiddleware.cs
│       ├── Models/
│       │   ├── Country.cs
│       │   ├── Merchant.cs
│       │   ├── Order.cs
│       │   ├── OrderItem.cs
│       │   ├── Product.cs
│       │   └── User.cs
│       ├── Properties/launchSettings.json
│       ├── Program.cs
│       ├── appsettings.json
│       ├── appsettings.Development.json
│       ├── WholesaleDealer.Api.csproj
│       └── WholesaleDealer.Api.http
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── BusinessCharts.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── config/entityConfigs.ts
│   │   ├── pages/
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EntityPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   ├── OrderBuilderPage.tsx
│   │   │   └── QuoteCalculatorPage.tsx
│   │   ├── services/api.ts
│   │   ├── types/api.ts
│   │   ├── utils/format.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── docs/
│   └── erd.png
├── scripts/
│   └── smoke-test.ps1
├── .gitignore
├── docker-compose.yml
├── WholesaleDealer.sln
└── README.md
```

Generated folders such as `node_modules`, `dist`, `bin`, and `obj` are intentionally excluded from the structure.

## Quick start with Docker Desktop

Prerequisites: Docker Desktop, .NET 8 SDK, and Node.js 20 or newer.

From the project root:

```powershell
docker compose up -d mysql
docker compose ps
```

The container initializes the schema and all sample data on its first start. Wait until its status is healthy, then start the API:

```powershell
dotnet restore .\WholesaleDealer.sln
dotnet run --project .\backend\WholesaleDealer.Api --launch-profile http
```

In a second terminal:

```powershell
cd .\frontend
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:5094/swagger`
- Health endpoint: `http://localhost:5094/api/health`

To stop MySQL:

```powershell
docker compose down
```

To also delete the Docker database volume and re-run all seed scripts on the next start:

```powershell
docker compose down -v
```

## Manual MySQL setup

If MySQL 8 is installed locally, execute the scripts in order:

```powershell
mysql -u root -p < .\database\01_schema.sql
mysql -u root -p wholesale_dealer < .\database\02_seed.sql
mysql -u root -p wholesale_dealer < .\database\04_verify.sql
```

`04_verify.sql` should return `20` for all six tables.

The checked-in development connection uses the Docker credentials:

```text
Server=localhost;Port=3307;Database=wholesale_dealer;User=wholesale_app;Password=wholesale_dev
```

For another MySQL account, avoid editing source-controlled settings and override the connection for the current PowerShell session:

```powershell
$env:ConnectionStrings__WholesaleDealer = "Server=localhost;Port=3306;Database=wholesale_dealer;User=root;Password=YOUR_PASSWORD;"
dotnet run --project .\backend\WholesaleDealer.Api --launch-profile http
```

## API routes

| Resource | Endpoints |
|---|---|
| Dashboard | `GET /api/dashboard` |
| Analytics | `GET /api/reports/business-kpis`, `GET /api/reports/sales-trend?days=90`, `GET /api/reports/order-status`, `GET /api/reports/top-products`, `GET /api/reports/top-merchants` |
| Supporting reports | `GET /api/reports/product-status`, `GET /api/reports/top-customers`, `GET /api/reports/sales-by-country`, `GET /api/reports/merchant-sales` |
| Calculations | `POST /api/calculations/order-total` |
| Countries | `GET/POST /api/countries`, `GET/PUT/DELETE /api/countries/{code}` |
| Users | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` |
| Merchants | `GET/POST /api/merchants`, `GET/PUT/DELETE /api/merchants/{id}` |
| Products | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}` |
| Orders | `GET/POST /api/orders`, `POST /api/orders/with-items`, `GET/PUT/DELETE /api/orders/{id}` |
| Order items | `GET/POST /api/order-items`, `GET/PUT/DELETE /api/order-items/{orderId}/{productId}` |
| Health | `GET /api/health` |

All controllers use asynchronous EF Core queries, DTO validation, no-tracking reads, proper `201`, `204`, `400`, `404`, and `409` responses, and global RFC 7807-style error output. Use `POST /api/orders/with-items` for normal sales entry because it validates and persists the order header and product lines together.

## Development checks

Run the complete compile and lint checks:

```powershell
dotnet build .\WholesaleDealer.sln --configuration Release
cd .\frontend
npm run build
npm run lint
```

Build output is written to `backend/**/bin` and `frontend/dist`.

With MySQL and the API running, execute the end-to-end API smoke suite from the project root:

```powershell
.\scripts\smoke-test.ps1
```

The script validates all six resources, dashboard/report contracts, calculator arithmetic, unavailable-product rejection, transactional order persistence, and guaranteed cleanup of its temporary order. Use `-BaseUrl` when the API runs on another address.

## Frontend environment

Copy `frontend/.env.example` to `frontend/.env` only when local overrides are needed:

```text
VITE_API_URL=/api
VITE_CURRENCY=USD
```

`VITE_CURRENCY` accepts an ISO 4217 currency code such as `USD`, `PKR`, `AED`, or `GBP`. It changes presentation only; the supplied ERD does not contain a currency column.

## ERD-preserving limitations

The application deliberately keeps the attached ERD unchanged. Because `order_items` contains only `order_id`, `product_id`, and `quantity`, historical order totals use each product's current catalog price. Discount, tax, and shipping values in the Quote Calculator are calculated for the current quote but are not persisted.

Before commercial use, a real deployment should extend the data model with price snapshots, invoices/quote records, currency, inventory movements, authentication and roles, an audit log, optimistic concurrency, and organization-specific authorization. Those changes are intentionally outside this ERD-exact semester project.

## Production configuration

- Store `ConnectionStrings__WholesaleDealer` in environment variables or a secret manager.
- Set `VITE_API_URL` to the deployed API base URL before `npm run build`.
- Set `VITE_CURRENCY` before `npm run build` when the display currency is not USD.
- Add the deployed frontend origin to `Cors:AllowedOrigins`.
- Serve `frontend/dist` through a static web server or CDN.
- Terminate HTTPS at the ASP.NET host or a trusted reverse proxy.
