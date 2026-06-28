using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;
using WholesaleDealer.Api.Infrastructure;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductResponse>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var query = db.Products.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(x =>
                EF.Functions.Like(x.Name, term) ||
                EF.Functions.Like(x.Merchant.MerchantName, term));
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(x => x.Status == status);
        }

        return Ok(await query
            .OrderBy(x => x.Name)
            .Select(MapExpression())
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var product = await db.Products.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapExpression())
            .SingleOrDefaultAsync(cancellationToken);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<ProductResponse>> Create(
        ProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = new Product
        {
            MerchantId = request.MerchantId,
            Name = request.Name.Trim(),
            Price = request.Price,
            Status = request.Status,
            CreatedAt = Timestamp.UtcNow()
        };
        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponse(product.Id, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductResponse>> Update(
        int id,
        ProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await db.Products.FindAsync([id], cancellationToken);
        if (product is null) return NotFound();

        product.MerchantId = request.MerchantId;
        product.Name = request.Name.Trim();
        product.Price = request.Price;
        product.Status = request.Status;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponse(id, cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var product = await db.Products.FindAsync([id], cancellationToken);
        if (product is null) return NotFound();

        db.Products.Remove(product);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<ProductResponse> BuildResponse(int id, CancellationToken cancellationToken) =>
        db.Products.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapExpression())
            .SingleAsync(cancellationToken);

    private static System.Linq.Expressions.Expression<Func<Product, ProductResponse>> MapExpression() =>
        x => new ProductResponse(
            x.Id, x.MerchantId, x.Merchant.MerchantName,
            x.Name, x.Price, x.Status, x.CreatedAt);
}
