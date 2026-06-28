namespace WholesaleDealer.Api.Models;

public sealed class User
{
    public int Id { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public required string Gender { get; set; }
    public required string DateOfBirth { get; set; }
    public int CountryCode { get; set; }
    public required string CreatedAt { get; set; }

    public Country Country { get; set; } = null!;
    public ICollection<Merchant> AdministeredMerchants { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}
