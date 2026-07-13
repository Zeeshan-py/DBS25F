using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WholesaleDealer.Api.Data;
using WholesaleDealer.Api.Dtos;

namespace WholesaleDealer.Api.Controllers;

[ApiController]
[Route("api/calculations")]
public sealed class CalculationsController(WholesaleDealerDbContext db) : ControllerBase
{
    [HttpPost("order-total")]
    public async Task<ActionResult<OrderTotalCalculationResponse>> CalculateOrderTotal(
        OrderTotalCalculationRequest request,
        CancellationToken cancellationToken)
    {
        var productIds = request.Items.Select(x => x.ProductId).ToArray();
        if (productIds.Distinct().Count() != productIds.Length)
        {
            ModelState.AddModelError(nameof(request.Items), "Each product can appear only once.");
            return ValidationProblem(ModelState);
        }

        var products = await db.Products.AsNoTracking()
            .Where(x => productIds.Contains(x.Id))
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Price,
                x.Status,
                MerchantName = x.Merchant.MerchantName
            })
            .ToListAsync(cancellationToken);

        var productsById = products.ToDictionary(x => x.Id);
        var missingProductIds = productIds
            .Where(id => !productsById.ContainsKey(id))
            .Order()
            .ToArray();
        if (missingProductIds.Length > 0)
        {
            ModelState.AddModelError(
                nameof(request.Items),
                $"Products not found: {string.Join(", ", missingProductIds)}.");
        }

        var unavailableProducts = products
            .Where(x => x.Status != "Active")
            .OrderBy(x => x.Name)
            .Select(x => $"{x.Name} ({x.Status})")
            .ToArray();
        if (unavailableProducts.Length > 0)
        {
            ModelState.AddModelError(
                nameof(request.Items),
                $"Only active products can be quoted. Unavailable: {string.Join(", ", unavailableProducts)}.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var lines = request.Items
            .Select(item =>
            {
                var product = productsById[item.ProductId];
                return new OrderTotalCalculationLineResponse(
                    product.Id,
                    product.Name,
                    product.MerchantName,
                    item.Quantity,
                    product.Price,
                    (long)item.Quantity * product.Price);
            })
            .ToList();

        var subtotal = lines.Sum(x => x.LineTotal);
        var discountAmount = MoneyRound(subtotal * request.DiscountPercentage / 100m);
        var taxableAmount = subtotal - discountAmount;
        var taxAmount = MoneyRound(taxableAmount * request.TaxPercentage / 100m);
        var shippingAmount = MoneyRound(request.ShippingAmount);
        var grandTotal = MoneyRound(taxableAmount + taxAmount + shippingAmount);

        return Ok(new OrderTotalCalculationResponse(
            lines.Sum(x => x.Quantity),
            subtotal,
            request.DiscountPercentage,
            discountAmount,
            taxableAmount,
            request.TaxPercentage,
            taxAmount,
            shippingAmount,
            grandTotal,
            lines));
    }

    private static decimal MoneyRound(decimal value) =>
        decimal.Round(value, 2, MidpointRounding.AwayFromZero);
}
