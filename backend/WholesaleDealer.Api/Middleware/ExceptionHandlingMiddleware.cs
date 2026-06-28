using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace WholesaleDealer.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Unhandled exception while processing {Method} {Path}",
                context.Request.Method, context.Request.Path);

            var (status, title, detail) = exception switch
            {
                DbUpdateException => (
                    StatusCodes.Status409Conflict,
                    "Database constraint conflict",
                    "The operation violates a unique, relationship, or validation constraint."),
                BadHttpRequestException => (
                    StatusCodes.Status400BadRequest,
                    "Invalid request",
                    exception.Message),
                _ => (
                    StatusCodes.Status500InternalServerError,
                    "Unexpected server error",
                    environment.IsDevelopment()
                        ? exception.Message
                        : "An unexpected error occurred. Please try again.")
            };

            context.Response.StatusCode = status;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = detail,
                Instance = context.Request.Path
            });
        }
    }
}
