-- Shop tenancy, product catalog and auditable stock ledger.
-- Apply after 0001_sync_operations.sql and the existing users table.

CREATE TABLE IF NOT EXISTS `shops` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ownerUserId` int NOT NULL,
  `name` varchar(160) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'LYD',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shops_slug_unique` (`slug`),
  KEY `shops_owner_idx` (`ownerUserId`),
  CONSTRAINT `shops_owner_user_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `shop_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shopId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('owner','manager','cashier') NOT NULL DEFAULT 'cashier',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shop_members_shop_user_unique` (`shopId`, `userId`),
  KEY `shop_members_user_idx` (`userId`),
  CONSTRAINT `shop_members_shop_fk` FOREIGN KEY (`shopId`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `shop_members_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shopId` int NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `description` text,
  `price` decimal(12,3) NOT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `products_shop_sku_unique` (`shopId`, `sku`),
  UNIQUE KEY `products_shop_name_unique` (`shopId`, `name`),
  CONSTRAINT `products_shop_fk` FOREIGN KEY (`shopId`) REFERENCES `shops` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shopId` int NOT NULL,
  `productId` int NOT NULL,
  `userId` int NOT NULL,
  `quantityDelta` int NOT NULL,
  `reason` enum('restock','sale','return','adjustment') NOT NULL,
  `referenceId` varchar(191) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `stock_movements_shop_product_idx` (`shopId`, `productId`),
  KEY `stock_movements_created_idx` (`shopId`, `createdAt`),
  CONSTRAINT `stock_movements_shop_fk` FOREIGN KEY (`shopId`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `stock_movements_product_fk` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `stock_movements_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);
