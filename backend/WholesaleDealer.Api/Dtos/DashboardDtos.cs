namespace WholesaleDealer.Api.Dtos;

public sealed record DashboardSummaryResponse(
    int TotalOrders,
    long TotalSales,
    int TotalMerchants,
    int ActiveProducts,
    IReadOnlyList<StatusCountResponse> OrderStatuses,
    IReadOnlyList<ActivityPointResponse> OrderActivity,
    IReadOnlyList<OrderResponse> RecentOrders,
    IReadOnlyList<ProductResponse> ProductStatuses);

public sealed record StatusCountResponse(string Status, int Count);
public sealed record ActivityPointResponse(string Date, int Orders);
