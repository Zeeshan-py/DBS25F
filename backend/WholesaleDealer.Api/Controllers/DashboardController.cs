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
        var activeProducts = await db.Products.CountAsync(x => x.Status == "Active", cancellationToken);
        var totalSales = await db.OrderItems
            .Where(x => x.Order.Status != "Cancelled")
            .SumAsync(x => (long)x.Quantity * x.Product.Price, cancellationToken);

        var statuses = await db.Orders.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(group => new StatusCountResponse(group.Key, group.Count()))
            .OrderBy(x => x.Status)
            .ToListAsync(cancellationToken);

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

        var activityDates = await db.Orders.AsNoTracking()
            .OrderBy(x => x.CreatedAt)
            .Select(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var activity = activityDates
            .GroupBy(x => x[..10])
            .Select(group => new ActivityPointResponse(group.Key, group.Count()))
            .OrderBy(x => x.Date)
            .ToList();

        return Ok(new DashboardSummaryResponse(
            totalOrders,
            totalSales,
            totalMerchants,
            activeProducts,
            statuses,
            activity,
            recentOrders,
            productStatuses));
    }
}
