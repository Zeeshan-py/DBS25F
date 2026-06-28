USE `wholesale_dealer`;

SELECT 'countries' AS table_name, COUNT(*) AS record_count FROM `countries`
UNION ALL
SELECT 'users', COUNT(*) FROM `users`
UNION ALL
SELECT 'merchants', COUNT(*) FROM `merchants`
UNION ALL
SELECT 'products', COUNT(*) FROM `products`
UNION ALL
SELECT 'orders', COUNT(*) FROM `orders`
UNION ALL
SELECT 'order_items', COUNT(*) FROM `order_items`;
