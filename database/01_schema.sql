-- Wholesale Dealer Database
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `wholesale_dealer`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `wholesale_dealer`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `merchants`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `countries`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `countries` (
  `code` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `continent_name` VARCHAR(50) NOT NULL,
  CONSTRAINT `pk_countries` PRIMARY KEY (`code`),
  CONSTRAINT `uq_countries_name` UNIQUE (`name`),
  CONSTRAINT `chk_countries_code_positive` CHECK (`code` > 0),
  CONSTRAINT `chk_countries_name_not_blank` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_countries_continent_not_blank` CHECK (CHAR_LENGTH(TRIM(`continent_name`)) > 0)
) ENGINE = InnoDB;

CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `gender` VARCHAR(20) NOT NULL,
  `date_of_birth` VARCHAR(10) NOT NULL,
  `country_code` INT NOT NULL,
  `created_at` VARCHAR(19) NOT NULL,
  CONSTRAINT `pk_users` PRIMARY KEY (`id`),
  CONSTRAINT `uq_users_email` UNIQUE (`email`),
  CONSTRAINT `fk_users_country`
    FOREIGN KEY (`country_code`) REFERENCES `countries` (`code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_users_name_not_blank` CHECK (CHAR_LENGTH(TRIM(`full_name`)) > 0),
  CONSTRAINT `chk_users_email_shape` CHECK (`email` LIKE '%_@_%._%'),
  CONSTRAINT `chk_users_gender` CHECK (`gender` IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  CONSTRAINT `chk_users_birth_format` CHECK (`date_of_birth` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  CONSTRAINT `chk_users_created_format` CHECK (`created_at` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$')
) ENGINE = InnoDB;

CREATE TABLE `merchants` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `merchant_name` VARCHAR(120) NOT NULL,
  `admin_id` INT NOT NULL,
  `country_code` INT NOT NULL,
  `created_at` VARCHAR(19) NOT NULL,
  CONSTRAINT `pk_merchants` PRIMARY KEY (`id`),
  CONSTRAINT `uq_merchants_name` UNIQUE (`merchant_name`),
  CONSTRAINT `fk_merchants_admin`
    FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_merchants_country`
    FOREIGN KEY (`country_code`) REFERENCES `countries` (`code`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_merchants_name_not_blank` CHECK (CHAR_LENGTH(TRIM(`merchant_name`)) > 0),
  CONSTRAINT `chk_merchants_created_format` CHECK (`created_at` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$')
) ENGINE = InnoDB;

CREATE TABLE `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `merchant_id` INT NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  `price` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `created_at` VARCHAR(19) NOT NULL,
  CONSTRAINT `pk_products` PRIMARY KEY (`id`),
  CONSTRAINT `uq_products_merchant_name` UNIQUE (`merchant_id`, `name`),
  CONSTRAINT `fk_products_merchant`
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_products_name_not_blank` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_products_price_positive` CHECK (`price` > 0),
  CONSTRAINT `chk_products_status` CHECK (`status` IN ('Active', 'Inactive', 'Out of Stock')),
  CONSTRAINT `chk_products_created_format` CHECK (`created_at` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$')
) ENGINE = InnoDB;

CREATE TABLE `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `created_at` VARCHAR(19) NOT NULL,
  CONSTRAINT `pk_orders` PRIMARY KEY (`id`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_orders_status` CHECK (`status` IN ('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled')),
  CONSTRAINT `chk_orders_created_format` CHECK (`created_at` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$')
) ENGINE = InnoDB;

CREATE TABLE `order_items` (
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  CONSTRAINT `pk_order_items` PRIMARY KEY (`order_id`, `product_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_order_items_quantity_positive` CHECK (`quantity` > 0)
) ENGINE = InnoDB;

CREATE INDEX `idx_users_country_code` ON `users` (`country_code`);
CREATE INDEX `idx_users_full_name` ON `users` (`full_name`);
CREATE INDEX `idx_merchants_admin_id` ON `merchants` (`admin_id`);
CREATE INDEX `idx_merchants_country_code` ON `merchants` (`country_code`);
CREATE INDEX `idx_products_merchant_id` ON `products` (`merchant_id`);
CREATE INDEX `idx_products_status` ON `products` (`status`);
CREATE INDEX `idx_orders_user_id` ON `orders` (`user_id`);
CREATE INDEX `idx_orders_status` ON `orders` (`status`);
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);
CREATE INDEX `idx_order_items_product_id` ON `order_items` (`product_id`);
