using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("WholesaleDealer")
    ?? throw new InvalidOperationException("Connection string 'WholesaleDealer' is not configured.");
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddDbContext<WholesaleDealerDbContext>(options =>
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 0, 36)),
        mysql => mysql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(5), null)));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Wholesale Dealer API",
        Version = "v1",
        Description = "Wholesale operations API for catalog management, transactional orders, reporting, analytics, and server-validated calculations."
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");
app.MapControllers();
app.MapGet("/api/health", async (
    WholesaleDealerDbContext db,
    CancellationToken cancellationToken) =>
{
    var databaseReady = await db.Database.CanConnectAsync(cancellationToken);
    var response = new
    {
        status = databaseReady ? "Healthy" : "Degraded",
        database = databaseReady ? "Connected" : "Unavailable",
        utcTime = DateTime.UtcNow
    };

    return databaseReady
        ? Results.Ok(response)
        : Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable);
})
    .WithTags("Health")
    .Produces(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status503ServiceUnavailable);

app.Run();

public partial class Program;
