namespace WholesaleDealer.Api.Dtos;

public sealed record DashboardSummaryResponse(
    int TotalOrders,
    long TotalSales,
    int TotalMerchants,
    int ActiveProducts,
    int TotalCustomers,
    int TotalProducts,
    int TotalCountries,
    int PendingOrders,
    int CompletedOrders,
    IReadOnlyList<OrderResponse> RecentOrders,
    IReadOnlyList<ProductResponse> ProductStatuses,
    IReadOnlyList<ProductStatusCountResponse> ProductStatusCounts,
    IReadOnlyList<TopCustomerResponse> TopCustomers,
    IReadOnlyList<SalesByCountryResponse> SalesByCountry,
    IReadOnlyList<MerchantSalesResponse> MerchantSales);

public sealed record ProductStatusCountResponse(
    string Status,
    int Count);

public sealed record TopCustomerResponse(
    int UserId,
    string FullName,
    int OrderCount,
    long TotalSpent);

public sealed record SalesByCountryResponse(
    string CountryName,
    int OrderCount,
    long TotalSales);

public sealed record MerchantSalesResponse(
    int MerchantId,
    string MerchantName,
    int ProductCount,
    long TotalSales);
