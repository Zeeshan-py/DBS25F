using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardSummaryResponse>> Get(CancellationToken cancellationToken)
    {
        // A scoped DbContext is intentionally queried sequentially because it is not thread-safe.
        var totalOrders = await db.Orders.CountAsync(cancellationToken);
        var totalMerchants = await db.Merchants.CountAsync(cancellationToken);
        var totalCustomers = await db.Users.CountAsync(cancellationToken);
        var totalProducts = await db.Products.CountAsync(cancellationToken);
        var totalCountries = await db.Countries.CountAsync(cancellationToken);
        var pendingOrders = await db.Orders.CountAsync(x => x.Status == "Pending", cancellationToken);
        var completedOrders = await db.Orders.CountAsync(x => x.Status == "Completed", cancellationToken);
        var activeProducts = await db.Products.CountAsync(x => x.Status == "Active", cancellationToken);
        var totalSales = await db.OrderItems
            .Where(x => x.Order.Status != "Cancelled")
            .SumAsync(x => (long)x.Quantity * x.Product.Price, cancellationToken);

        var recentOrders = await db.Orders.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(5)
            .Select(x => new OrderResponse(
                x.Id, x.UserId, x.User.FullName, x.Status, x.CreatedAt,
                x.OrderItems.Sum(item => (long?)item.Quantity * item.Product.Price) ?? 0))
            .ToListAsync(cancellationToken);

        var productStatuses = await db.Products.AsNoTracking()
            .OrderBy(x => x.Status == "Out of Stock" ? 0 : x.Status == "Inactive" ? 1 : 2)
            .ThenBy(x => x.Name)
            .Take(5)
            .Select(x => new ProductResponse(
                x.Id, x.MerchantId, x.Merchant.MerchantName,
                x.Name, x.Price, x.Status, x.CreatedAt))
            .ToListAsync(cancellationToken);

        var productStatusCounts = await db.Products.AsNoTracking()
            .GroupBy(x => x.Status)
            .OrderBy(x => x.Key)
            .Select(x => new ProductStatusCountResponse(x.Key, x.Count()))
            .ToListAsync(cancellationToken);

        var topCustomers = await db.Users.AsNoTracking()
            .Select(x => new
            {
                UserId = x.Id,
                x.FullName,
                OrderCount = x.Orders.Count,
                TotalSpent = x.Orders
                    .Where(order => order.Status != "Cancelled")
                    .SelectMany(order => order.OrderItems)
                    .Sum(item => (long?)item.Quantity * item.Product.Price) ?? 0
            })
            .OrderByDescending(x => x.TotalSpent)
            .ThenBy(x => x.FullName)
            .Take(5)
            .ToListAsync(cancellationToken);

        var salesByCountry = await db.Countries.AsNoTracking()
            .Select(x => new
            {
                CountryName = x.Name,
                OrderCount = x.Users.SelectMany(user => user.Orders).Count(),
                TotalSales = x.Users
                    .SelectMany(user => user.Orders)
                    .Where(order => order.Status != "Cancelled")
                    .SelectMany(order => order.OrderItems)
                    .Sum(item => (long?)item.Quantity * item.Product.Price) ?? 0
            })
            .OrderByDescending(x => x.TotalSales)
            .ThenBy(x => x.CountryName)
            .Take(5)
            .ToListAsync(cancellationToken);

        var merchantSales = await db.Merchants.AsNoTracking()
            .Select(x => new
            {
                MerchantId = x.Id,
                x.MerchantName,
                ProductCount = x.Products.Count,
                TotalSales = x.Products
                    .SelectMany(product => product.OrderItems)
                    .Where(item => item.Order.Status != "Cancelled")
                    .Sum(item => (long?)item.Quantity * item.Product.Price) ?? 0
            })
            .OrderByDescending(x => x.TotalSales)
            .ThenBy(x => x.MerchantName)
            .Take(5)
            .ToListAsync(cancellationToken);

        return Ok(new DashboardSummaryResponse(
            totalOrders,
            totalSales,
            totalMerchants,
            activeProducts,
            totalCustomers,
            totalProducts,
            totalCountries,
            pendingOrders,
            completedOrders,
            recentOrders,
            productStatuses,
            productStatusCounts,
            topCustomers
                .Select(x => new TopCustomerResponse(x.UserId, x.FullName, x.OrderCount, x.TotalSpent))
                .ToList(),
            salesByCountry
                .Select(x => new SalesByCountryResponse(x.CountryName, x.OrderCount, x.TotalSales))
                .ToList(),
            merchantSales
                .Select(x => new MerchantSalesResponse(x.MerchantId, x.MerchantName, x.ProductCount, x.TotalSales))
                .ToList()));
    }
}
