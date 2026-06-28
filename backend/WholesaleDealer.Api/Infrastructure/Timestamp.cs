using System.Globalization;

namespace WholesaleDealer.Api.Infrastructure;

public static class Timestamp
{
    public static string UtcNow() =>
        DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
}
