namespace WholesaleDealer.Api.Models;

public sealed class Product
{
    public int Id { get; set; }
    public int MerchantId { get; set; }
    public required string Name { get; set; }
    public int Price { get; set; }
    public required string Status { get; set; }
    public required string CreatedAt { get; set; }

    public Merchant Merchant { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}
