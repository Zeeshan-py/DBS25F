using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController(WholesaleDealerDbContext db) : ControllerBase
{
    private static readonly string[] OrderStatuses =
        ["Pending", "Processing", "Shipped", "Completed", "Cancelled"];

    [HttpGet("business-kpis")]
    public async Task<ActionResult<BusinessKpiResponse>> GetBusinessKpis(
        CancellationToken cancellationToken)
    {
        var orderCounts = await db.Orders.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(group => new
            {
                Status = group.Key,
                Count = group.Count()
            })
            .ToListAsync(cancellationToken);

        var salesByStatus = await db.OrderItems.AsNoTracking()
            .GroupBy(x => x.Order.Status)
            .Select(group => new
            {
                Status = group.Key,
                RevenueOrderCount = group.Select(x => x.OrderId).Distinct().Count(),
                UnitsSold = group.Sum(x => (long)x.Quantity),
                TotalSales = group.Sum(x => (long)x.Quantity * x.Product.Price)
            })
            .ToListAsync(cancellationToken);

        var countByStatus = orderCounts.ToDictionary(x => x.Status, x => x.Count);
        var totalOrders = orderCounts.Sum(x => x.Count);
        var completedOrders = countByStatus.GetValueOrDefault("Completed");
        var cancelledOrders = countByStatus.GetValueOrDefault("Cancelled");
        // Average commercial values only across orders that contain at least one line.
        // Draft/legacy empty headers remain visible in operational order counts but do not distort AOV.
        var revenueOrders = salesByStatus
            .Where(x => x.Status != "Cancelled")
            .Sum(x => x.RevenueOrderCount);
        var totalSales = salesByStatus
            .Where(x => x.Status != "Cancelled")
            .Sum(x => x.TotalSales);
        var completedSales = salesByStatus
            .Where(x => x.Status == "Completed")
            .Sum(x => x.TotalSales);
        var unitsSold = salesByStatus
            .Where(x => x.Status != "Cancelled")
            .Sum(x => x.UnitsSold);

        return Ok(new BusinessKpiResponse(
            totalOrders,
            totalOrders - completedOrders - cancelledOrders,
            completedOrders,
            cancelledOrders,
            totalSales,
            completedSales,
            unitsSold,
            Divide(totalSales, revenueOrders),
            Divide(unitsSold, revenueOrders),
            Percentage(completedOrders, totalOrders),
            Percentage(cancelledOrders, totalOrders)));
    }

    [HttpGet("sales-trend")]
    public async Task<ActionResult<IReadOnlyList<SalesTrendPointResponse>>> GetSalesTrend(
        [FromQuery, Range(7, 365)] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var latestTimestamp = await db.Orders.AsNoTracking()
            .MaxAsync(x => (string?)x.CreatedAt, cancellationToken);
        if (latestTimestamp is null)
        {
            return Ok(Array.Empty<SalesTrendPointResponse>());
        }

        var latestDate = DateOnly.ParseExact(
            latestTimestamp[..10],
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture);
        var firstDate = latestDate.AddDays(-(days - 1));

        // Aggregate in MySQL first, then fill missing calendar dates in memory.
        // This avoids provider-specific VARCHAR-to-date casts because the ERD stores timestamps as VARCHAR.
        var orderRows = await db.Orders.AsNoTracking()
            .Where(x => x.Status != "Cancelled")
            .GroupBy(x => x.CreatedAt.Substring(0, 10))
            .Select(group => new
            {
                Date = group.Key,
                OrderCount = group.Count()
            })
            .ToListAsync(cancellationToken);

        var salesRows = await db.OrderItems.AsNoTracking()
            .Where(x => x.Order.Status != "Cancelled")
            .GroupBy(x => x.Order.CreatedAt.Substring(0, 10))
            .Select(group => new
            {
                Date = group.Key,
                UnitsSold = group.Sum(x => (long)x.Quantity),
                TotalSales = group.Sum(x => (long)x.Quantity * x.Product.Price)
            })
            .ToListAsync(cancellationToken);

        var ordersByDate = orderRows.ToDictionary(x => x.Date, x => x.OrderCount);
        var salesByDate = salesRows.ToDictionary(x => x.Date);
        var result = new List<SalesTrendPointResponse>(days);

        for (var date = firstDate; date <= latestDate; date = date.AddDays(1))
        {
            var key = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var hasSales = salesByDate.TryGetValue(key, out var sales);
            result.Add(new SalesTrendPointResponse(
                key,
                ordersByDate.GetValueOrDefault(key),
                hasSales ? sales!.UnitsSold : 0,
                hasSales ? sales!.TotalSales : 0));
        }

        return Ok(result);
    }

    [HttpGet("order-status")]
    public async Task<ActionResult<IReadOnlyList<OrderStatusAnalyticsResponse>>> GetOrderStatusAnalytics(
        CancellationToken cancellationToken)
    {
        var orderRows = await db.Orders.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(group => new
            {
                Status = group.Key,
                OrderCount = group.Count()
            })
            .ToListAsync(cancellationToken);

        var salesRows = await db.OrderItems.AsNoTracking()
            .GroupBy(x => x.Order.Status)
            .Select(group => new
            {
                Status = group.Key,
                UnitsSold = group.Sum(x => (long)x.Quantity),
                TotalSales = group.Sum(x => (long)x.Quantity * x.Product.Price)
            })
            .ToListAsync(cancellationToken);

        var ordersByStatus = orderRows.ToDictionary(x => x.Status, x => x.OrderCount);
        var salesByStatus = salesRows.ToDictionary(x => x.Status);
        var totalOrders = orderRows.Sum(x => x.OrderCount);

        var result = OrderStatuses
            .Select(status =>
            {
                var count = ordersByStatus.GetValueOrDefault(status);
                var hasSales = salesByStatus.TryGetValue(status, out var sales);
                return new OrderStatusAnalyticsResponse(
                    status,
                    count,
                    Percentage(count, totalOrders),
                    hasSales ? sales!.UnitsSold : 0,
                    hasSales ? sales!.TotalSales : 0);
            })
            .ToList();

        return Ok(result);
    }

    [HttpGet("top-products")]
    public async Task<ActionResult<IReadOnlyList<TopProductAnalyticsResponse>>> GetTopProducts(
        [FromQuery, Range(1, 50)] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var rows = await db.OrderItems.AsNoTracking()
            .Where(x => x.Order.Status != "Cancelled")
            .GroupBy(x => new
            {
                x.ProductId,
                ProductName = x.Product.Name,
                MerchantName = x.Product.Merchant.MerchantName
            })
            .Select(group => new
            {
                group.Key.ProductId,
                group.Key.ProductName,
                group.Key.MerchantName,
                OrderCount = group.Select(x => x.OrderId).Distinct().Count(),
                UnitsSold = group.Sum(x => (long)x.Quantity),
                TotalSales = group.Sum(x => (long)x.Quantity * x.Product.Price)
            })
            .OrderByDescending(x => x.TotalSales)
            .ThenBy(x => x.ProductName)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Ok(rows
            .Select(x => new TopProductAnalyticsResponse(
                x.ProductId,
                x.ProductName,
                x.MerchantName,
                x.OrderCount,
                x.UnitsSold,
                x.TotalSales))
            .ToList());
    }

    [HttpGet("top-merchants")]
    public async Task<ActionResult<IReadOnlyList<TopMerchantAnalyticsResponse>>> GetTopMerchants(
        [FromQuery, Range(1, 50)] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var rows = await db.OrderItems.AsNoTracking()
            .Where(x => x.Order.Status != "Cancelled")
            .GroupBy(x => new
            {
                MerchantId = x.Product.MerchantId,
                MerchantName = x.Product.Merchant.MerchantName
            })
            .Select(group => new
            {
                group.Key.MerchantId,
                group.Key.MerchantName,
                OrderCount = group.Select(x => x.OrderId).Distinct().Count(),
                UnitsSold = group.Sum(x => (long)x.Quantity),
                TotalSales = group.Sum(x => (long)x.Quantity * x.Product.Price)
            })
            .OrderByDescending(x => x.TotalSales)
            .ThenBy(x => x.MerchantName)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var merchantIds = rows.Select(x => x.MerchantId).ToArray();
        var productCounts = merchantIds.Length == 0
            ? new Dictionary<int, int>()
            : await db.Products.AsNoTracking()
                .Where(x => merchantIds.Contains(x.MerchantId))
                .GroupBy(x => x.MerchantId)
                .ToDictionaryAsync(group => group.Key, group => group.Count(), cancellationToken);

        return Ok(rows
            .Select(x => new TopMerchantAnalyticsResponse(
                x.MerchantId,
                x.MerchantName,
                productCounts.GetValueOrDefault(x.MerchantId),
                x.OrderCount,
                x.UnitsSold,
                x.TotalSales))
            .ToList());
    }

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

    private static decimal Divide(long numerator, int denominator) =>
        denominator == 0
            ? 0
            : decimal.Round((decimal)numerator / denominator, 2, MidpointRounding.AwayFromZero);

    private static decimal Percentage(int numerator, int denominator) =>
        denominator == 0
            ? 0
            : decimal.Round(numerator * 100m / denominator, 2, MidpointRounding.AwayFromZero);
}
