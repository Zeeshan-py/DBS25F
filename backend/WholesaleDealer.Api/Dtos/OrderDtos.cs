using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record OrderResponse(
    int Id,
    int UserId,
    string UserName,
    string Status,
    string CreatedAt,
    long TotalAmount);

public sealed class OrderRequest
{
    [Range(1, int.MaxValue)]
    public int UserId { get; init; }

    [Required, RegularExpression("^(Pending|Processing|Shipped|Completed|Cancelled)$")]
    public required string Status { get; init; }
}
