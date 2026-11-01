-- AlterTable
ALTER TABLE `users` ADD COLUMN `password_hash` VARCHAR(255) NULL,
    ADD COLUMN `username` VARCHAR(50) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);
