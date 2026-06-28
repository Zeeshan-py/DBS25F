using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record ProductResponse(
    int Id,
    int MerchantId,
    string MerchantName,
    string Name,
    int Price,
    string Status,
    string CreatedAt);

public sealed class ProductRequest
{
    [Range(1, int.MaxValue)]
    public int MerchantId { get; init; }

    [Required, StringLength(140, MinimumLength = 2)]
    public required string Name { get; init; }

    [Range(1, int.MaxValue)]
    public int Price { get; init; }

    [Required, RegularExpression("^(Active|Inactive|Out of Stock)$")]
    public required string Status { get; init; }
}
