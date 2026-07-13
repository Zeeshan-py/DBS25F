[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()]
    [string]$BaseUrl = 'http://127.0.0.1:5094'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$BaseUrl = $BaseUrl.TrimEnd('/')
$script:Passed = 0
$script:Skipped = 0

function Write-Pass {
    param([Parameter(Mandatory)][string]$Message)

    $script:Passed++
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Skip {
    param([Parameter(Mandatory)][string]$Message)

    $script:Skipped++
    Write-Host "[SKIP] $Message" -ForegroundColor Yellow
}

function Assert-True {
    param(
        [Parameter(Mandatory)][bool]$Condition,
        [Parameter(Mandatory)][string]$Message
    )

    if (-not $Condition) {
        throw "Assertion failed: $Message"
    }
}

function Assert-HasProperties {
    param(
        [AllowNull()][object]$Value,
        [Parameter(Mandatory)][string[]]$Properties,
        [Parameter(Mandatory)][string]$Context
    )

    if ($null -eq $Value) {
        throw "Assertion failed: $Context was null."
    }

    foreach ($property in $Properties) {
        if ($null -eq $Value.PSObject.Properties[$property]) {
            throw "Assertion failed: $Context is missing property '$property'."
        }
    }
}

function Assert-MoneyEqual {
    param(
        [Parameter(Mandatory)][decimal]$Actual,
        [Parameter(Mandatory)][decimal]$Expected,
        [Parameter(Mandatory)][string]$Context
    )

    if ($Actual -ne $Expected) {
        throw "Assertion failed: $Context expected $Expected but received $Actual."
    }
}

function Round-Money {
    param([Parameter(Mandatory)][decimal]$Value)

    return [Math]::Round($Value, 2, [MidpointRounding]::AwayFromZero)
}

function Invoke-ApiRequest {
    param(
        [Parameter(Mandatory)][ValidateSet('Get', 'Post', 'Delete')][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [object]$Body
    )

    $arguments = @{
        Uri         = "$BaseUrl$Path"
        Method      = $Method
        Headers     = @{ Accept = 'application/json' }
        TimeoutSec  = 30
        ErrorAction = 'Stop'
    }

    if ($PSBoundParameters.ContainsKey('Body')) {
        $arguments.ContentType = 'application/json'
        $arguments.Body = $Body | ConvertTo-Json -Depth 10 -Compress
    }

    return Invoke-RestMethod @arguments
}

function Assert-ApiRejects {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][object]$Body,
        [int]$ExpectedStatus = 400
    )

    try {
        $null = Invoke-WebRequest `
            -Uri "$BaseUrl$Path" `
            -Method Post `
            -Headers @{ Accept = 'application/json' } `
            -ContentType 'application/json' `
            -Body ($Body | ConvertTo-Json -Depth 10 -Compress) `
            -TimeoutSec 30 `
            -UseBasicParsing `
            -ErrorAction Stop

        throw "Expected HTTP $ExpectedStatus from $Path, but the request succeeded."
    }
    catch {
        $response = $_.Exception.Response
        if ($null -eq $response) {
            throw
        }

        $actualStatus = [int]$response.StatusCode
        if ($actualStatus -ne $ExpectedStatus) {
            throw "Expected HTTP $ExpectedStatus from $Path, but received HTTP $actualStatus."
        }
    }
}

function Get-RequiredCollection {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string[]]$Properties
    )

    $response = Invoke-ApiRequest -Method Get -Path $Path
    $items = @($response)
    Assert-True ($items.Count -gt 0) "$Name should contain at least one seeded record."
    Assert-HasProperties ($items[0]) $Properties "$Name response item"
    Write-Pass "$Name read returned $($items.Count) record(s) with the expected shape."
    return $items
}

$temporaryOrderId = $null
$testFailure = $null
$cleanupFailure = $null

Write-Host "Running API smoke tests against $BaseUrl" -ForegroundColor Cyan

try {
    $health = Invoke-ApiRequest -Method Get -Path '/api/health'
    Assert-HasProperties $health @('status', 'database', 'utcTime') 'Health response'
    Assert-True ($health.status -eq 'Healthy') "Health status should be 'Healthy'."
    Assert-True ($health.database -eq 'Connected') "Database status should be 'Connected'."
    Write-Pass 'Health endpoint confirms API and database readiness.'

    $countries = Get-RequiredCollection '/api/countries' 'Countries' @(
        'code', 'name', 'continentName'
    )
    $users = Get-RequiredCollection '/api/users' 'Users' @(
        'id', 'fullName', 'email', 'gender', 'dateOfBirth', 'countryCode', 'countryName', 'createdAt'
    )
    $merchants = Get-RequiredCollection '/api/merchants' 'Merchants' @(
        'id', 'merchantName', 'adminId', 'adminName', 'countryCode', 'countryName', 'createdAt'
    )
    $products = Get-RequiredCollection '/api/products' 'Products' @(
        'id', 'merchantId', 'merchantName', 'name', 'price', 'status', 'createdAt'
    )
    $orders = Get-RequiredCollection '/api/orders' 'Orders' @(
        'id', 'userId', 'userName', 'status', 'createdAt', 'totalAmount'
    )
    $orderItems = Get-RequiredCollection '/api/order-items' 'Order items' @(
        'orderId', 'customerName', 'productId', 'productName', 'quantity', 'unitPrice', 'lineTotal'
    )

    $countries = @($countries)
    $users = @($users)
    $merchants = @($merchants)
    $products = @($products)
    $orders = @($orders)
    $orderItems = @($orderItems)

    # Keep these variables referenced so strict static analysis and future edits do not hide failed reads.
    Assert-True (($countries.Count + $merchants.Count + $orders.Count + $orderItems.Count) -gt 0) `
        'Core entity reads should return data.'

    $dashboard = Invoke-ApiRequest -Method Get -Path '/api/dashboard'
    Assert-HasProperties $dashboard @(
        'totalOrders', 'totalSales', 'totalMerchants', 'activeProducts', 'totalCustomers',
        'totalProducts', 'totalCountries', 'pendingOrders', 'completedOrders', 'recentOrders',
        'productStatuses', 'productStatusCounts', 'topCustomers', 'salesByCountry', 'merchantSales'
    ) 'Dashboard response'
    Write-Pass 'Dashboard summary returned the expected response shape.'

    $kpis = Invoke-ApiRequest -Method Get -Path '/api/reports/business-kpis'
    Assert-HasProperties $kpis @(
        'totalOrders', 'openOrders', 'completedOrders', 'cancelledOrders', 'totalSales',
        'completedSales', 'unitsSold', 'averageOrderValue', 'averageUnitsPerOrder',
        'completionRate', 'cancellationRate'
    ) 'Business KPI response'
    Assert-True ([int]$kpis.totalOrders -ge 0) 'KPI totalOrders must be non-negative.'
    Write-Pass 'Business KPI analytics returned the expected shape.'

    $salesTrend = Invoke-ApiRequest -Method Get -Path '/api/reports/sales-trend?days=7'
    $salesTrend = @($salesTrend)
    Assert-True ($salesTrend.Count -eq 7) 'Seven-day sales trend should contain exactly seven points.'
    foreach ($point in $salesTrend) {
        Assert-HasProperties $point @('date', 'orderCount', 'unitsSold', 'totalSales') 'Sales trend point'
        Assert-True ($point.date -match '^\d{4}-\d{2}-\d{2}$') 'Sales trend dates must use YYYY-MM-DD.'
    }
    Write-Pass 'Sales trend analytics returned seven correctly shaped points.'

    $orderStatus = Invoke-ApiRequest -Method Get -Path '/api/reports/order-status'
    $orderStatus = @($orderStatus)
    Assert-True ($orderStatus.Count -eq 5) 'Order-status analytics should include all five statuses.'
    foreach ($row in $orderStatus) {
        Assert-HasProperties $row @('status', 'orderCount', 'percentage', 'unitsSold', 'totalSales') `
            'Order-status analytics item'
    }
    Write-Pass 'Order-status analytics returned all statuses with the expected shape.'

    $topProducts = Invoke-ApiRequest -Method Get -Path '/api/reports/top-products?limit=5'
    $topProducts = @($topProducts)
    Assert-True (($topProducts.Count -gt 0) -and ($topProducts.Count -le 5)) `
        'Top-products analytics should return between one and five records.'
    foreach ($row in $topProducts) {
        Assert-HasProperties $row @(
            'productId', 'productName', 'merchantName', 'orderCount', 'unitsSold', 'totalSales'
        ) 'Top-product analytics item'
    }
    Write-Pass 'Top-products analytics returned the expected shape.'

    $topMerchants = Invoke-ApiRequest -Method Get -Path '/api/reports/top-merchants?limit=5'
    $topMerchants = @($topMerchants)
    Assert-True (($topMerchants.Count -gt 0) -and ($topMerchants.Count -le 5)) `
        'Top-merchants analytics should return between one and five records.'
    foreach ($row in $topMerchants) {
        Assert-HasProperties $row @(
            'merchantId', 'merchantName', 'catalogProductCount', 'orderCount', 'unitsSold', 'totalSales'
        ) 'Top-merchant analytics item'
    }
    Write-Pass 'Top-merchants analytics returned the expected shape.'

    $activeProducts = @($products | Where-Object { $_.status -eq 'Active' })
    Assert-True ($activeProducts.Count -gt 0) 'At least one active product is required for calculation tests.'
    $quotedProduct = $activeProducts[0]
    $quoteQuantity = 3
    $discountPercentage = [decimal]12.5
    $taxPercentage = [decimal]17
    $shippingAmount = [decimal]250.75
    $quoteRequest = @{
        items = @(@{
            productId = [int]$quotedProduct.id
            quantity = $quoteQuantity
        })
        discountPercentage = $discountPercentage
        taxPercentage = $taxPercentage
        shippingAmount = $shippingAmount
    }
    $quote = Invoke-ApiRequest -Method Post -Path '/api/calculations/order-total' -Body $quoteRequest
    Assert-HasProperties $quote @(
        'totalQuantity', 'subtotal', 'discountPercentage', 'discountAmount', 'taxableAmount',
        'taxPercentage', 'taxAmount', 'shippingAmount', 'grandTotal', 'items'
    ) 'Quote response'
    $quoteLines = @($quote.items)
    Assert-True ($quoteLines.Count -eq 1) 'Quote should contain exactly one line.'
    Assert-HasProperties ($quoteLines[0]) @(
        'productId', 'productName', 'merchantName', 'quantity', 'unitPrice', 'lineTotal'
    ) 'Quote line'

    $expectedSubtotal = [decimal]([int]$quotedProduct.price * $quoteQuantity)
    $expectedDiscount = Round-Money ($expectedSubtotal * $discountPercentage / 100)
    $expectedTaxable = $expectedSubtotal - $expectedDiscount
    $expectedTax = Round-Money ($expectedTaxable * $taxPercentage / 100)
    $expectedGrandTotal = Round-Money ($expectedTaxable + $expectedTax + $shippingAmount)
    Assert-True ([int]$quote.totalQuantity -eq $quoteQuantity) 'Quote total quantity is incorrect.'
    Assert-MoneyEqual ([decimal]$quote.subtotal) $expectedSubtotal 'Quote subtotal'
    Assert-MoneyEqual ([decimal]$quote.discountAmount) $expectedDiscount 'Quote discount'
    Assert-MoneyEqual ([decimal]$quote.taxableAmount) $expectedTaxable 'Quote taxable amount'
    Assert-MoneyEqual ([decimal]$quote.taxAmount) $expectedTax 'Quote tax'
    Assert-MoneyEqual ([decimal]$quote.shippingAmount) $shippingAmount 'Quote shipping'
    Assert-MoneyEqual ([decimal]$quote.grandTotal) $expectedGrandTotal 'Quote grand total'
    Assert-MoneyEqual ([decimal]$quoteLines[0].lineTotal) $expectedSubtotal 'Quote line total'
    Write-Pass 'Quote calculator returned correct server-side arithmetic.'

    $unavailableProduct = $products |
        Where-Object { $_.status -ne 'Active' } |
        Select-Object -First 1
    if ($null -ne $unavailableProduct) {
        $unavailableRequest = @{
            items = @(@{ productId = [int]$unavailableProduct.id; quantity = 1 })
            discountPercentage = 0
            taxPercentage = 0
            shippingAmount = 0
        }
        Assert-ApiRejects -Path '/api/calculations/order-total' -Body $unavailableRequest -ExpectedStatus 400
        Write-Pass "Quote validation rejected unavailable product $($unavailableProduct.id)."
    }
    else {
        Write-Skip 'Unavailable-product rejection (GET /products returned only active products).'
    }

    $orderQuantity = 2
    $orderRequest = @{
        userId = [int]$users[0].id
        status = 'Pending'
        items = @(@{
            productId = [int]$quotedProduct.id
            quantity = $orderQuantity
        })
    }
    $createdOrder = Invoke-ApiRequest -Method Post -Path '/api/orders/with-items' -Body $orderRequest
    if ($null -ne $createdOrder -and $null -ne $createdOrder.PSObject.Properties['id']) {
        # Capture the ID before any assertions so finally can clean up even if the response shape regresses.
        $temporaryOrderId = [int]$createdOrder.id
    }
    Assert-HasProperties $createdOrder @(
        'id', 'userId', 'userName', 'status', 'createdAt', 'totalQuantity', 'subtotal', 'items'
    ) 'Created transactional order response'
    Assert-True ($temporaryOrderId -gt 0) 'Created order ID must be positive.'
    Assert-True ([int]$createdOrder.totalQuantity -eq $orderQuantity) `
        'Created order total quantity is incorrect.'
    $expectedOrderSubtotal = [decimal]([int]$quotedProduct.price * $orderQuantity)
    Assert-MoneyEqual ([decimal]$createdOrder.subtotal) $expectedOrderSubtotal 'Created order subtotal'

    $savedOrder = Invoke-ApiRequest -Method Get -Path "/api/orders/$temporaryOrderId"
    Assert-HasProperties $savedOrder @(
        'id', 'userId', 'userName', 'status', 'createdAt', 'totalAmount'
    ) 'Saved order response'
    Assert-True ([int]$savedOrder.id -eq $temporaryOrderId) 'Saved order ID does not match the created order.'
    Assert-MoneyEqual ([decimal]$savedOrder.totalAmount) $expectedOrderSubtotal 'Saved order total'

    $savedLines = Invoke-ApiRequest -Method Get -Path "/api/order-items?orderId=$temporaryOrderId"
    $savedLines = @($savedLines)
    Assert-True ($savedLines.Count -eq 1) 'Transactional order should persist exactly one line.'
    Assert-HasProperties ($savedLines[0]) @(
        'orderId', 'customerName', 'productId', 'productName', 'quantity', 'unitPrice', 'lineTotal'
    ) 'Saved order line response'
    Assert-True ([int]$savedLines[0].orderId -eq $temporaryOrderId) 'Saved line has the wrong order ID.'
    Assert-True ([int]$savedLines[0].productId -eq [int]$quotedProduct.id) `
        'Saved line has the wrong product ID.'
    Assert-True ([int]$savedLines[0].quantity -eq $orderQuantity) 'Saved line has the wrong quantity.'
    Assert-MoneyEqual ([decimal]$savedLines[0].lineTotal) $expectedOrderSubtotal 'Saved line total'
    Write-Pass 'Transactional order creation persisted its header and line atomically.'
}
catch {
    $testFailure = $_
}
finally {
    if ($null -ne $temporaryOrderId) {
        try {
            $null = Invoke-ApiRequest -Method Delete -Path "/api/orders/$temporaryOrderId"
            Write-Pass "Temporary order $temporaryOrderId was deleted during cleanup."
        }
        catch {
            $cleanupFailure = $_
        }
    }
}

if ($null -ne $cleanupFailure) {
    $message = "Cleanup failed for temporary order ${temporaryOrderId}: $($cleanupFailure.Exception.Message)"
    if ($null -ne $testFailure) {
        $message += " Original test failure: $($testFailure.Exception.Message)"
    }
    Write-Host "[FAIL] $message" -ForegroundColor Red
    throw $message
}

if ($null -ne $testFailure) {
    Write-Host "[FAIL] $($testFailure.Exception.Message)" -ForegroundColor Red
    throw $testFailure
}

Write-Host "Smoke tests passed: $script:Passed; skipped: $script:Skipped." -ForegroundColor Cyan
