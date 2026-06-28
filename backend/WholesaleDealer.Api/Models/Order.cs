namespace WholesaleDealer.Api.Models;

public sealed class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public required string Status { get; set; }
    public required string CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}
