using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;
using WholesaleDealer.Api.Infrastructure;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/merchants")]
public sealed class MerchantsController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MerchantResponse>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.Merchants.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(x => EF.Functions.Like(x.MerchantName, term));
        }

        return Ok(await query
            .OrderBy(x => x.MerchantName)
            .Select(x => new MerchantResponse(
                x.Id, x.MerchantName, x.AdminId, x.Admin.FullName,
                x.CountryCode, x.Country.Name, x.CreatedAt))
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MerchantResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var merchant = await db.Merchants.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new MerchantResponse(
                x.Id, x.MerchantName, x.AdminId, x.Admin.FullName,
                x.CountryCode, x.Country.Name, x.CreatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return merchant is null ? NotFound() : Ok(merchant);
    }

    [HttpPost]
    public async Task<ActionResult<MerchantResponse>> Create(
        MerchantRequest request,
        CancellationToken cancellationToken)
    {
        var merchant = new Merchant
        {
            MerchantName = request.MerchantName.Trim(),
            AdminId = request.AdminId,
            CountryCode = request.CountryCode,
            CreatedAt = Timestamp.UtcNow()
        };
        db.Merchants.Add(merchant);
        await db.SaveChangesAsync(cancellationToken);

        var response = await BuildResponse(merchant.Id, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = merchant.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MerchantResponse>> Update(
        int id,
        MerchantRequest request,
        CancellationToken cancellationToken)
    {
        var merchant = await db.Merchants.FindAsync([id], cancellationToken);
        if (merchant is null) return NotFound();

        merchant.MerchantName = request.MerchantName.Trim();
        merchant.AdminId = request.AdminId;
        merchant.CountryCode = request.CountryCode;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponse(id, cancellationToken));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var merchant = await db.Merchants.FindAsync([id], cancellationToken);
        if (merchant is null) return NotFound();

        db.Merchants.Remove(merchant);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private Task<MerchantResponse> BuildResponse(int id, CancellationToken cancellationToken) =>
        db.Merchants.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new MerchantResponse(
                x.Id, x.MerchantName, x.AdminId, x.Admin.FullName,
                x.CountryCode, x.Country.Name, x.CreatedAt))
            .SingleAsync(cancellationToken);
}
