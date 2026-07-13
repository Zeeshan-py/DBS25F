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
        var order = await db.Orders.AsNoTracking()
            .Where(x => x.Id == request.OrderId)
            .Select(x => new { x.Id, x.Status })
            .SingleOrDefaultAsync(cancellationToken);
        if (order is null)
        {
            ModelState.AddModelError(nameof(request.OrderId), "Order was not found.");
        }
        else if (IsTerminal(order.Status))
        {
            return OrderLocked(order.Id, order.Status);
        }

        var product = await db.Products.AsNoTracking()
            .Where(x => x.Id == request.ProductId)
            .Select(x => new { x.Id, x.Name, x.Status })
            .SingleOrDefaultAsync(cancellationToken);
        if (product is null)
        {
            ModelState.AddModelError(nameof(request.ProductId), "Product was not found.");
        }
        else if (product.Status != "Active")
        {
            ModelState.AddModelError(
                nameof(request.ProductId),
                $"Only active products can be ordered. {product.Name} is {product.Status}.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

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

        var item = await db.OrderItems
            .Include(x => x.Order)
            .SingleOrDefaultAsync(
                x => x.OrderId == orderId && x.ProductId == productId,
                cancellationToken);
        if (item is null) return NotFound();
        if (IsTerminal(item.Order.Status))
        {
            return OrderLocked(item.OrderId, item.Order.Status);
        }

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
        var item = await db.OrderItems
            .Include(x => x.Order)
            .SingleOrDefaultAsync(
                x => x.OrderId == orderId && x.ProductId == productId,
                cancellationToken);
        if (item is null) return NotFound();
        if (IsTerminal(item.Order.Status))
        {
            return OrderLocked(item.OrderId, item.Order.Status);
        }

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

    private static bool IsTerminal(string status) =>
        status is "Completed" or "Cancelled";

    private ObjectResult OrderLocked(int orderId, string status) =>
        Conflict(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Order is locked",
            Detail = $"Order {orderId} is {status} and its items can no longer be changed."
        });
}
