-- POS receipts and immutable line snapshots with a per-shop idempotency key.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shopId` int NOT NULL,
  `clientSaleId` varchar(128) NOT NULL,
  `createdBy` int NOT NULL,
  `subtotal` decimal(12,3) NOT NULL,
  `total` decimal(12,3) NOT NULL,
  `paymentMethod` varchar(32) NOT NULL DEFAULT 'cash',
  `status` enum('completed','voided','returned') NOT NULL DEFAULT 'completed',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sales_shop_client_sale_unique` (`shopId`, `clientSaleId`),
  KEY `sales_shop_created_idx` (`shopId`, `createdAt`),
  CONSTRAINT `sales_shop_fk` FOREIGN KEY (`shopId`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_created_by_fk` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `saleId` int NOT NULL,
  `shopId` int NOT NULL,
  `productId` int NOT NULL,
  `productName` varchar(191) NOT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unitPrice` decimal(12,3) NOT NULL,
  `lineTotal` decimal(12,3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sale_items_sale_idx` (`saleId`),
  KEY `sale_items_shop_sale_idx` (`shopId`, `saleId`),
  CONSTRAINT `sale_items_sale_fk` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_shop_fk` FOREIGN KEY (`shopId`) REFERENCES `shops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sale_items_product_fk` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT
);
