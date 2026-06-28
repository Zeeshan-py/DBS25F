using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/countries")]
public sealed class CountriesController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CountryResponse>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.Countries.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(x =>
                EF.Functions.Like(x.Name, term) ||
                EF.Functions.Like(x.ContinentName, term));
        }

        return Ok(await query
            .OrderBy(x => x.Name)
            .Select(x => new CountryResponse(x.Code, x.Name, x.ContinentName))
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{code:int}")]
    public async Task<ActionResult<CountryResponse>> GetByCode(int code, CancellationToken cancellationToken)
    {
        var country = await db.Countries.AsNoTracking()
            .Where(x => x.Code == code)
            .Select(x => new CountryResponse(x.Code, x.Name, x.ContinentName))
            .SingleOrDefaultAsync(cancellationToken);

        return country is null ? NotFound() : Ok(country);
    }

    [HttpPost]
    public async Task<ActionResult<CountryResponse>> Create(
        CountryRequest request,
        CancellationToken cancellationToken)
    {
        var country = new Country
        {
            Code = request.Code,
            Name = request.Name.Trim(),
            ContinentName = request.ContinentName.Trim()
        };

        db.Countries.Add(country);
        await db.SaveChangesAsync(cancellationToken);

        var response = new CountryResponse(country.Code, country.Name, country.ContinentName);
        return CreatedAtAction(nameof(GetByCode), new { code = country.Code }, response);
    }

    [HttpPut("{code:int}")]
    public async Task<ActionResult<CountryResponse>> Update(
        int code,
        CountryRequest request,
        CancellationToken cancellationToken)
    {
        if (code != request.Code)
        {
            ModelState.AddModelError(nameof(request.Code), "The country code cannot be changed.");
            return ValidationProblem(ModelState);
        }

        var country = await db.Countries.FindAsync([code], cancellationToken);
        if (country is null) return NotFound();

        country.Name = request.Name.Trim();
        country.ContinentName = request.ContinentName.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new CountryResponse(country.Code, country.Name, country.ContinentName));
    }

    [HttpDelete("{code:int}")]
    public async Task<IActionResult> Delete(int code, CancellationToken cancellationToken)
    {
        var country = await db.Countries.FindAsync([code], cancellationToken);
        if (country is null) return NotFound();

        db.Countries.Remove(country);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
