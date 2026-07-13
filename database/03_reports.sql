USE `wholesale_dealer`;

-- Order totals with customer information.
SELECT
  o.id AS order_id,
  u.full_name AS customer,
  o.status,
  o.created_at,
  SUM(oi.quantity * p.price) AS order_total
FROM `orders` AS o
JOIN `users` AS u ON u.id = o.user_id
JOIN `order_items` AS oi ON oi.order_id = o.id
JOIN `products` AS p ON p.id = oi.product_id
GROUP BY o.id, u.full_name, o.status, o.created_at
ORDER BY o.created_at DESC;

-- Merchant catalog summary.
SELECT
  m.id,
  m.merchant_name,
  c.name AS country,
  COUNT(p.id) AS product_count,
  COALESCE(SUM(CASE WHEN p.status = 'Active' THEN 1 ELSE 0 END), 0) AS active_products
FROM `merchants` AS m
JOIN `countries` AS c ON c.code = m.country_code
LEFT JOIN `products` AS p ON p.merchant_id = m.id
GROUP BY m.id, m.merchant_name, c.name
ORDER BY m.merchant_name;

-- Product sales performance, including products with no order.
SELECT
  p.id,
  p.name,
  m.merchant_name,
  COALESCE(SUM(oi.quantity), 0) AS units_ordered,
  COALESCE(SUM(oi.quantity * p.price), 0) AS gross_value
FROM `products` AS p
JOIN `merchants` AS m ON m.id = p.merchant_id
LEFT JOIN `order_items` AS oi ON oi.product_id = p.id
GROUP BY p.id, p.name, m.merchant_name
ORDER BY gross_value DESC;

-- Executive KPIs. Cancelled orders are excluded from commercial totals.
SELECT
  COUNT(DISTINCT CASE WHEN o.status <> 'Cancelled' AND oi.order_id IS NOT NULL THEN o.id END) AS revenue_order_count,
  COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN oi.quantity ELSE 0 END), 0) AS units_sold,
  COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN oi.quantity * p.price ELSE 0 END), 0) AS net_sales,
  COALESCE(
    ROUND(
      SUM(CASE WHEN o.status <> 'Cancelled' THEN oi.quantity * p.price ELSE 0 END)
      / NULLIF(COUNT(DISTINCT CASE WHEN o.status <> 'Cancelled' AND oi.order_id IS NOT NULL THEN o.id END), 0)
    ),
    0
  ) AS average_order_value
FROM `orders` AS o
LEFT JOIN `order_items` AS oi ON oi.order_id = o.id
LEFT JOIN `products` AS p ON p.id = oi.product_id;

-- Daily sales trend for charts and forecasting discussions.
SELECT
  LEFT(o.created_at, 10) AS sales_date,
  COUNT(DISTINCT o.id) AS order_count,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.quantity * p.price) AS sales
FROM `orders` AS o
JOIN `order_items` AS oi ON oi.order_id = o.id
JOIN `products` AS p ON p.id = oi.product_id
WHERE o.status <> 'Cancelled'
GROUP BY LEFT(o.created_at, 10)
ORDER BY sales_date;

-- Fulfilment pipeline distribution.
SELECT
  o.status,
  COUNT(*) AS order_count,
  COALESCE(SUM(oi.order_value), 0) AS order_value
FROM `orders` AS o
LEFT JOIN (
  SELECT
    item.order_id,
    SUM(item.quantity * product.price) AS order_value
  FROM `order_items` AS item
  JOIN `products` AS product ON product.id = item.product_id
  GROUP BY item.order_id
) AS oi ON oi.order_id = o.id
GROUP BY o.status
ORDER BY order_count DESC, o.status;

-- Merchant revenue leaderboard, excluding cancelled orders.
SELECT
  m.id AS merchant_id,
  m.merchant_name,
  COUNT(DISTINCT p.id) AS product_count,
  COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN oi.quantity ELSE 0 END), 0) AS units_sold,
  COALESCE(SUM(CASE WHEN o.status <> 'Cancelled' THEN oi.quantity * p.price ELSE 0 END), 0) AS sales
FROM `merchants` AS m
LEFT JOIN `products` AS p ON p.merchant_id = m.id
LEFT JOIN `order_items` AS oi ON oi.product_id = p.id
LEFT JOIN `orders` AS o ON o.id = oi.order_id
GROUP BY m.id, m.merchant_name
ORDER BY sales DESC, m.merchant_name;
