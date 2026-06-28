namespace WholesaleDealer.Api.Models;

public sealed class Merchant
{
    public int Id { get; set; }
    public required string MerchantName { get; set; }
    public int AdminId { get; set; }
    public int CountryCode { get; set; }
    public required string CreatedAt { get; set; }

    public User Admin { get; set; } = null!;
    public Country Country { get; set; } = null!;
    public ICollection<Product> Products { get; set; } = [];
}
