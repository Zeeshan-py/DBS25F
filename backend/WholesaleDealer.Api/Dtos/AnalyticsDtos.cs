using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record BusinessKpiResponse(
    int TotalOrders,
    int OpenOrders,
    int CompletedOrders,
    int CancelledOrders,
    long TotalSales,
    long CompletedSales,
    long UnitsSold,
    decimal AverageOrderValue,
    decimal AverageUnitsPerOrder,
    decimal CompletionRate,
    decimal CancellationRate);

public sealed record SalesTrendPointResponse(
    string Date,
    int OrderCount,
    long UnitsSold,
    long TotalSales);

public sealed record OrderStatusAnalyticsResponse(
    string Status,
    int OrderCount,
    decimal Percentage,
    long UnitsSold,
    long TotalSales);

public sealed record TopProductAnalyticsResponse(
    int ProductId,
    string ProductName,
    string MerchantName,
    int OrderCount,
    long UnitsSold,
    long TotalSales);

public sealed record TopMerchantAnalyticsResponse(
    int MerchantId,
    string MerchantName,
    int CatalogProductCount,
    int OrderCount,
    long UnitsSold,
    long TotalSales);

public sealed class OrderTotalCalculationRequest
{
    [Required, MinLength(1), MaxLength(100)]
    public required IReadOnlyList<OrderTotalCalculationItemRequest> Items { get; init; }

    [Range(typeof(decimal), "0", "100")]
    public decimal DiscountPercentage { get; init; }

    [Range(typeof(decimal), "0", "100")]
    public decimal TaxPercentage { get; init; }

    [Range(typeof(decimal), "0", "999999999999999.99")]
    public decimal ShippingAmount { get; init; }
}

public sealed class OrderTotalCalculationItemRequest
{
    [Range(1, int.MaxValue)]
    public int ProductId { get; init; }

    [Range(1, 100000)]
    public int Quantity { get; init; }
}

public sealed record OrderTotalCalculationLineResponse(
    int ProductId,
    string ProductName,
    string MerchantName,
    int Quantity,
    int UnitPrice,
    long LineTotal);

public sealed record OrderTotalCalculationResponse(
    int TotalQuantity,
    long Subtotal,
    decimal DiscountPercentage,
    decimal DiscountAmount,
    decimal TaxableAmount,
    decimal TaxPercentage,
    decimal TaxAmount,
    decimal ShippingAmount,
    decimal GrandTotal,
    IReadOnlyList<OrderTotalCalculationLineResponse> Items);
