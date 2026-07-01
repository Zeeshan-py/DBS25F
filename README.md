# Wholesale Dealer Database System

A complete Database Systems semester project based on the supplied ERD. It manages countries, users, merchants, products, orders, and order items through a MySQL 8 database, an ASP.NET Core 8 API, and a React/Vite administration dashboard.

## Technology

- MySQL 8.0 / InnoDB / `utf8mb4`
- ASP.NET Core 8 Web API
- Entity Framework Core 8 with Pomelo
- Swagger / OpenAPI
- React 19 + TypeScript + Vite
- Axios, React Router, and Lucide icons

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
│       │   ├── CountriesController.cs
│       │   ├── DashboardController.cs
│       │   ├── MerchantsController.cs
│       │   ├── OrderItemsController.cs
│       │   ├── OrdersController.cs
│       │   ├── ProductsController.cs
│       │   └── UsersController.cs
│       ├── Data/WholesaleDealerDbContext.cs
│       ├── Dtos/
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
│   │   │   ├── Modal.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── config/entityConfigs.ts
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EntityPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── services/api.ts
│   │   ├── types/api.ts
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
| Countries | `GET/POST /api/countries`, `GET/PUT/DELETE /api/countries/{code}` |
| Users | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` |
| Merchants | `GET/POST /api/merchants`, `GET/PUT/DELETE /api/merchants/{id}` |
| Products | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}` |
| Orders | `GET/POST /api/orders`, `GET/PUT/DELETE /api/orders/{id}` |
| Order items | `GET/POST /api/order-items`, `GET/PUT/DELETE /api/order-items/{orderId}/{productId}` |

All controllers use asynchronous EF Core queries, DTO validation, no-tracking reads, proper `201`, `204`, `400`, `404`, and `409` responses, and global RFC 7807-style error output.

## Development checks

Run the complete compile and lint checks:

```powershell
dotnet build .\WholesaleDealer.sln --configuration Release
cd .\frontend
npm run build
npm run lint
```

Build output is written to `backend/**/bin` and `frontend/dist`.

## Production configuration

- Store `ConnectionStrings__WholesaleDealer` in environment variables or a secret manager.
- Set `VITE_API_URL` to the deployed API base URL before `npm run build`.
- Add the deployed frontend origin to `Cors:AllowedOrigins`.
- Serve `frontend/dist` through a static web server or CDN.
- Terminate HTTPS at the ASP.NET host or a trusted reverse proxy.
