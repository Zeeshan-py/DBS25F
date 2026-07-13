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

public sealed class CreateOrderWithItemsRequest
{
    [Range(1, int.MaxValue)]
    public int UserId { get; init; }

    [Required, RegularExpression("^(Pending|Processing|Shipped|Completed|Cancelled)$")]
    public required string Status { get; init; }

    [Required, MinLength(1), MaxLength(100)]
    public required IReadOnlyList<CreateOrderLineRequest> Items { get; init; }
}

public sealed class CreateOrderLineRequest
{
    [Range(1, int.MaxValue)]
    public int ProductId { get; init; }

    [Range(1, 100000)]
    public int Quantity { get; init; }
}

public sealed record CreatedOrderLineResponse(
    int ProductId,
    string ProductName,
    string MerchantName,
    int Quantity,
    int UnitPrice,
    long LineTotal);

public sealed record CreatedOrderWithItemsResponse(
    int Id,
    int UserId,
    string UserName,
    string Status,
    string CreatedAt,
    int TotalQuantity,
    long Subtotal,
    IReadOnlyList<CreatedOrderLineResponse> Items);
