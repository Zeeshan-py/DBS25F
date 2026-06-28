using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;
using WholesaleDealer.Api.Infrastructure;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderResponse>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var query = db.Orders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(x => EF.Functions.Like(x.User.FullName, term));
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x => x.Status == status);
        }

        return Ok(await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(MapExpression())
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var order = await db.Orders.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapExpression())
            .SingleOrDefaultAsync(cancellationToken);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<OrderResponse>> Create(
        OrderRequest request,
        CancellationToken cancellationToken)
    {
        var order = new Order
        {
            UserId = request.UserId,
            Status = request.Status,
            CreatedAt = Timestamp.UtcNow()
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponse(order.Id, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<OrderResponse>> Update(
        int id,
        OrderRequest request,
        CancellationToken cancellationToken)
    {
        var order = await db.Orders.FindAsync([id], cancellationToken);
        if (order is null) return NotFound();

        order.UserId = request.UserId;
        order.Status = request.Status;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponse(id, cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var order = await db.Orders.FindAsync([id], cancellationToken);
        if (order is null) return NotFound();

        db.Orders.Remove(order);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<OrderResponse> BuildResponse(int id, CancellationToken cancellationToken) =>
        db.Orders.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapExpression())
            .SingleAsync(cancellationToken);

    private static System.Linq.Expressions.Expression<Func<Order, OrderResponse>> MapExpression() =>
        x => new OrderResponse(
            x.Id, x.UserId, x.User.FullName, x.Status, x.CreatedAt,
            x.OrderItems.Sum(item => (long?)item.Quantity * item.Product.Price) ?? 0);
}
