using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet("product-status")]
    public async Task<ActionResult<IReadOnlyList<ProductStatusCountResponse>>> GetProductStatusReport(
        CancellationToken cancellationToken)
    {
        var report = await db.Products.AsNoTracking()
            .GroupBy(x => x.Status)
            .OrderBy(x => x.Key)
            .Select(x => new ProductStatusCountResponse(x.Key, x.Count()))
            .ToListAsync(cancellationToken);

        return Ok(report);
    }

    [HttpGet("top-customers")]
    public async Task<ActionResult<IReadOnlyList<TopCustomerResponse>>> GetTopCustomers(
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 50);

        var rows = await db.Users.AsNoTracking()
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
            .Take(limit)
            .ToListAsync(cancellationToken);

        var report = rows
            .Select(x => new TopCustomerResponse(x.UserId, x.FullName, x.OrderCount, x.TotalSpent))
            .ToList();

        return Ok(report);
    }

    [HttpGet("sales-by-country")]
    public async Task<ActionResult<IReadOnlyList<SalesByCountryResponse>>> GetSalesByCountry(
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 50);

        var rows = await db.Countries.AsNoTracking()
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
            .Take(limit)
            .ToListAsync(cancellationToken);

        var report = rows
            .Select(x => new SalesByCountryResponse(x.CountryName, x.OrderCount, x.TotalSales))
            .ToList();

        return Ok(report);
    }

    [HttpGet("merchant-sales")]
    public async Task<ActionResult<IReadOnlyList<MerchantSalesResponse>>> GetMerchantSales(
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        limit = Math.Clamp(limit, 1, 50);

        var rows = await db.Merchants.AsNoTracking()
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
            .Take(limit)
            .ToListAsync(cancellationToken);

        var report = rows
            .Select(x => new MerchantSalesResponse(x.MerchantId, x.MerchantName, x.ProductCount, x.TotalSales))
            .ToList();

        return Ok(report);
    }
}
