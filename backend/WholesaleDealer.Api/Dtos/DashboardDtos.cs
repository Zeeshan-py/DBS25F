namespace WholesaleDealer.Api.Dtos;

public sealed record DashboardSummaryResponse(
    int TotalOrders,
    long TotalSales,
    int TotalMerchants,
    int ActiveProducts,
    IReadOnlyList<OrderResponse> RecentOrders,
    IReadOnlyList<ProductResponse> ProductStatuses);
