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

    [HttpPost("with-items")]
    public async Task<ActionResult<CreatedOrderWithItemsResponse>> CreateWithItems(
        CreateOrderWithItemsRequest request,
        CancellationToken cancellationToken)
    {
        var productIds = request.Items.Select(x => x.ProductId).ToArray();
        if (productIds.Distinct().Count() != productIds.Length)
        {
            ModelState.AddModelError(nameof(request.Items), "Each product can appear only once.");
            return ValidationProblem(ModelState);
        }

        var customerName = await db.Users.AsNoTracking()
            .Where(x => x.Id == request.UserId)
            .Select(x => x.FullName)
            .SingleOrDefaultAsync(cancellationToken);
        if (customerName is null)
        {
            ModelState.AddModelError(nameof(request.UserId), "Customer was not found.");
        }

        var products = await db.Products.AsNoTracking()
            .Where(x => productIds.Contains(x.Id))
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Price,
                x.Status,
                MerchantName = x.Merchant.MerchantName
            })
            .ToListAsync(cancellationToken);
        var productsById = products.ToDictionary(x => x.Id);

        var missingProductIds = productIds
            .Where(id => !productsById.ContainsKey(id))
            .Order()
            .ToArray();
        if (missingProductIds.Length > 0)
        {
            ModelState.AddModelError(
                nameof(request.Items),
                $"Products not found: {string.Join(", ", missingProductIds)}.");
        }

        var unavailableProducts = products
            .Where(x => x.Status != "Active")
            .OrderBy(x => x.Name)
            .Select(x => $"{x.Name} ({x.Status})")
            .ToArray();
        if (unavailableProducts.Length > 0)
        {
            ModelState.AddModelError(
                nameof(request.Items),
                $"Only active products can be ordered. Unavailable: {string.Join(", ", unavailableProducts)}.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        Order? order = null;
        var executionStrategy = db.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
            // A retry must start with a clean tracker so the same order is not staged twice.
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

            order = new Order
            {
                UserId = request.UserId,
                Status = request.Status,
                CreatedAt = Timestamp.UtcNow(),
                OrderItems = request.Items
                    .Select(x => new OrderItem
                    {
                        ProductId = x.ProductId,
                        Quantity = x.Quantity
                    })
                    .ToList()
            };

            db.Orders.Add(order);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });

        var lines = request.Items
            .Select(item =>
            {
                var product = productsById[item.ProductId];
                return new CreatedOrderLineResponse(
                    product.Id,
                    product.Name,
                    product.MerchantName,
                    item.Quantity,
                    product.Price,
                    (long)item.Quantity * product.Price);
            })
            .ToList();

        var createdOrder = order
            ?? throw new InvalidOperationException("Order creation completed without an order result.");
        var response = new CreatedOrderWithItemsResponse(
            createdOrder.Id,
            createdOrder.UserId,
            customerName!,
            createdOrder.Status,
            createdOrder.CreatedAt,
            lines.Sum(x => x.Quantity),
            lines.Sum(x => x.LineTotal),
            lines);

        return CreatedAtAction(nameof(GetById), new { id = createdOrder.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<OrderResponse>> Update(
        int id,
        OrderRequest request,
        CancellationToken cancellationToken)
    {
        var order = await db.Orders.FindAsync([id], cancellationToken);
        if (order is null) return NotFound();

        if (IsTerminal(order.Status))
        {
            if (order.Status == request.Status && order.UserId == request.UserId)
            {
                return Ok(await BuildResponse(id, cancellationToken));
            }

            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Order is locked",
                Detail = $"Order {id} is {order.Status} and can no longer be changed."
            });
        }

        if (order.Status != request.Status && !CanTransition(order.Status, request.Status))
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Invalid order status transition",
                Detail = $"An order cannot move directly from {order.Status} to {request.Status}."
            });
        }

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

    private static bool IsTerminal(string status) =>
        status is "Completed" or "Cancelled";

    private static bool CanTransition(string currentStatus, string nextStatus) =>
        (currentStatus, nextStatus) switch
        {
            ("Pending", "Processing" or "Cancelled") => true,
            ("Processing", "Shipped" or "Cancelled") => true,
            ("Shipped", "Completed" or "Cancelled") => true,
            _ => false
        };
}
