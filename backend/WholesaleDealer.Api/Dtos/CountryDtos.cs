using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record CountryResponse(int Code, string Name, string ContinentName);

public sealed class CountryRequest
{
    [Range(1, int.MaxValue)]
    public int Code { get; init; }

    [Required, StringLength(100)]
    public required string Name { get; init; }

    [Required, StringLength(50)]
    public required string ContinentName { get; init; }
}
