using System.ComponentModel.DataAnnotations;

namespace WholesaleDealer.Api.Dtos;

public sealed record UserResponse(
    int Id,
    string FullName,
    string Email,
    string Gender,
    string DateOfBirth,
    int CountryCode,
    string CountryName,
    string CreatedAt);

public sealed class UserRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public required string FullName { get; init; }

    [Required, EmailAddress, StringLength(160)]
    public required string Email { get; init; }

    [Required, RegularExpression("^(Male|Female|Other|Prefer not to say)$")]
    public required string Gender { get; init; }

    [Required, RegularExpression(@"^\d{4}-\d{2}-\d{2}$")]
    public required string DateOfBirth { get; init; }

    [Range(1, int.MaxValue)]
    public int CountryCode { get; init; }
}
