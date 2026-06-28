namespace WholesaleDealer.Api.Models;

public sealed class Country
{
    public int Code { get; set; }
    public required string Name { get; set; }
    public required string ContinentName { get; set; }

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Merchant> Merchants { get; set; } = [];
}
