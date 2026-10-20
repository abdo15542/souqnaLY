-- Apply after the existing users table has been created.
-- Durable sync inbox; operations are acknowledged only after they are stored.
CREATE TABLE IF NOT EXISTS `sync_operations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `operationId` varchar(64) NOT NULL,
  `kind` enum(
    'product.upsert',
    'stock.adjust',
    'sale.create',
    'sale.return',
    'customer.upsert',
    'marketplace.listing.upsert',
    'marketplace.order.create'
  ) NOT NULL,
  `entityId` varchar(191) NOT NULL,
  `payload` json NOT NULL,
  `clientCreatedAt` timestamp NOT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending', 'processed', 'failed') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sync_operations_user_operation_unique` (`userId`, `operationId`),
  KEY `sync_operations_user_status_idx` (`userId`, `status`),
  CONSTRAINT `sync_operations_user_fk`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
