using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/order-items")]
public sealed class OrderItemsController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderItemResponse>>> GetAll(
        [FromQuery] int? orderId,
        CancellationToken cancellationToken)
    {
        var query = db.OrderItems.AsNoTracking();
        if (orderId.HasValue)
        {
            query = query.Where(x => x.OrderId == orderId.Value);
        }

        return Ok(await query
            .OrderByDescending(x => x.OrderId)
            .ThenBy(x => x.Product.Name)
            .Select(MapExpression())
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{orderId:int}/{productId:int}")]
    public async Task<ActionResult<OrderItemResponse>> GetById(
        int orderId,
        int productId,
        CancellationToken cancellationToken)
    {
        var item = await db.OrderItems.AsNoTracking()
            .Where(x => x.OrderId == orderId && x.ProductId == productId)
            .Select(MapExpression())
            .SingleOrDefaultAsync(cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<OrderItemResponse>> Create(
        OrderItemRequest request,
        CancellationToken cancellationToken)
    {
        var item = new OrderItem
        {
            OrderId = request.OrderId,
            ProductId = request.ProductId,
            Quantity = request.Quantity
        };
        db.OrderItems.Add(item);
        await db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponse(item.OrderId, item.ProductId, cancellationToken);
        return CreatedAtAction(
            nameof(GetById),
            new { orderId = item.OrderId, productId = item.ProductId },
            response);
    }

    [HttpPut("{orderId:int}/{productId:int}")]
    public async Task<ActionResult<OrderItemResponse>> Update(
        int orderId,
        int productId,
        OrderItemRequest request,
        CancellationToken cancellationToken)
    {
        if (orderId != request.OrderId || productId != request.ProductId)
        {
            ModelState.AddModelError("key", "Order ID and Product ID cannot be changed.");
            return ValidationProblem(ModelState);
        }

        var item = await db.OrderItems.FindAsync([orderId, productId], cancellationToken);
        if (item is null) return NotFound();

        item.Quantity = request.Quantity;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponse(orderId, productId, cancellationToken));
    }

    [HttpDelete("{orderId:int}/{productId:int}")]
    public async Task<IActionResult> Delete(
        int orderId,
        int productId,
        CancellationToken cancellationToken)
    {
        var item = await db.OrderItems.FindAsync([orderId, productId], cancellationToken);
        if (item is null) return NotFound();

        db.OrderItems.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<OrderItemResponse> BuildResponse(
        int orderId,
        int productId,
        CancellationToken cancellationToken) =>
        db.OrderItems.AsNoTracking()
            .Where(x => x.OrderId == orderId && x.ProductId == productId)
            .Select(MapExpression())
            .SingleAsync(cancellationToken);

    private static System.Linq.Expressions.Expression<Func<OrderItem, OrderItemResponse>> MapExpression() =>
        x => new OrderItemResponse(
            x.OrderId, x.Order.User.FullName, x.ProductId, x.Product.Name,
            x.Quantity, x.Product.Price, (long)x.Quantity * x.Product.Price);
}
