using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record OrderItemResponse(
    int OrderId,
    string CustomerName,
    int ProductId,
    string ProductName,
    int Quantity,
    int UnitPrice,
    long LineTotal);

public sealed class OrderItemRequest
{
    [Range(1, int.MaxValue)]
    public int OrderId { get; init; }

    [Range(1, int.MaxValue)]
    public int ProductId { get; init; }

    [Range(1, 100000)]
    public int Quantity { get; init; }
}
