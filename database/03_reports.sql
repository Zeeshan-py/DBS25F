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
