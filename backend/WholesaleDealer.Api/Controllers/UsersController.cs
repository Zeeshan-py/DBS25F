using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;
using WholesaleDealer.Api.Infrastructure;
using WholesaleDealer.Api.Models;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(x =>
                EF.Functions.Like(x.FullName, term) ||
                EF.Functions.Like(x.Email, term));
        }

        return Ok(await query
            .OrderBy(x => x.FullName)
            .Select(x => new UserResponse(
                x.Id, x.FullName, x.Email, x.Gender, x.DateOfBirth,
                x.CountryCode, x.Country.Name, x.CreatedAt))
            .ToListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new UserResponse(
                x.Id, x.FullName, x.Email, x.Gender, x.DateOfBirth,
                x.CountryCode, x.Country.Name, x.CreatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(UserRequest request, CancellationToken cancellationToken)
    {
        if (!ValidateDateOfBirth(request.DateOfBirth)) return ValidationProblem(ModelState);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Gender = request.Gender,
            DateOfBirth = request.DateOfBirth,
            CountryCode = request.CountryCode,
            CreatedAt = Timestamp.UtcNow()
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        var countryName = await db.Countries
            .Where(x => x.Code == user.CountryCode)
            .Select(x => x.Name)
            .SingleAsync(cancellationToken);
        var response = Map(user, countryName);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserResponse>> Update(
        int id,
        UserRequest request,
        CancellationToken cancellationToken)
    {
        if (!ValidateDateOfBirth(request.DateOfBirth)) return ValidationProblem(ModelState);

        var user = await db.Users.FindAsync([id], cancellationToken);
        if (user is null) return NotFound();

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim().ToLowerInvariant();
        user.Gender = request.Gender;
        user.DateOfBirth = request.DateOfBirth;
        user.CountryCode = request.CountryCode;
        await db.SaveChangesAsync(cancellationToken);

        var countryName = await db.Countries
            .Where(x => x.Code == user.CountryCode)
            .Select(x => x.Name)
            .SingleAsync(cancellationToken);
        return Ok(Map(user, countryName));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var user = await db.Users.FindAsync([id], cancellationToken);
        if (user is null) return NotFound();

        db.Users.Remove(user);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private bool ValidateDateOfBirth(string value)
    {
        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", out var date) &&
            date <= DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return true;
        }

        ModelState.AddModelError(nameof(UserRequest.DateOfBirth), "Use a real past date in YYYY-MM-DD format.");
        return false;
    }

    private static UserResponse Map(User user, string countryName) =>
        new(user.Id, user.FullName, user.Email, user.Gender, user.DateOfBirth,
            user.CountryCode, countryName, user.CreatedAt);
}
