using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record MerchantResponse(
    int Id,
    string MerchantName,
    int AdminId,
    string AdminName,
    int CountryCode,
    string CountryName,
    string CreatedAt);

public sealed class MerchantRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public required string MerchantName { get; init; }

    [Range(1, int.MaxValue)]
    public int AdminId { get; init; }

    [Range(1, int.MaxValue)]
    public int CountryCode { get; init; }
}
