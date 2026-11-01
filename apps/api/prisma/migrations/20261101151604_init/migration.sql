-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    `locale` VARCHAR(10) NOT NULL DEFAULT 'id',
    `notify_push` BOOLEAN NOT NULL DEFAULT true,
    `notify_email` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_identities` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `provider` ENUM('google', 'facebook', 'apple', 'email') NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_identities_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_identities_provider_provider_user_id_key`(`provider`, `provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `family_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `replaced_by_id` CHAR(36) NULL,
    `user_agent` VARCHAR(255) NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_family_id_idx`(`family_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `platform` ENUM('android', 'ios', 'web') NOT NULL,
    `device_name` VARCHAR(120) NULL,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `push_tokens_token_key`(`token`),
    INDEX `push_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `garages` (
    `id` CHAR(36) NOT NULL,
    `owner_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `garages_owner_id_idx`(`owner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `garage_members` (
    `garage_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `role` ENUM('owner', 'editor', 'viewer') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `garage_members_user_id_idx`(`user_id`),
    PRIMARY KEY (`garage_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `brands_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_3d_assets` (
    `key` VARCHAR(64) NOT NULL,
    `category` ENUM('underbone', 'scooter', 'sport', 'trail', 'car_hatchback', 'car_sedan', 'car_mpv', 'car_suv', 'other') NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `version` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `license_note` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_models` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `brand_id` INTEGER UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `kind` ENUM('motorcycle', 'car') NOT NULL,
    `category` ENUM('underbone', 'scooter', 'sport', 'trail', 'car_hatchback', 'car_sedan', 'car_mpv', 'car_suv', 'other') NOT NULL,
    `engine_cc` SMALLINT UNSIGNED NULL,
    `fuel_system` ENUM('carburetor', 'injection') NULL,
    `transmission` ENUM('manual', 'semi_automatic', 'automatic') NULL,
    `final_drive` ENUM('chain', 'belt', 'shaft') NULL,
    `year_start` SMALLINT UNSIGNED NULL,
    `year_end` SMALLINT UNSIGNED NULL,
    `model_3d_key` VARCHAR(64) NOT NULL,
    `specs` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `vehicle_models_slug_key`(`slug`),
    INDEX `vehicle_models_brand_id_idx`(`brand_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parts` (
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NOT NULL,
    `group` ENUM('engine', 'fuel', 'drivetrain', 'brake', 'electrical', 'suspension', 'wheel', 'body', 'fluid') NOT NULL,
    `applies_to` JSON NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `function_text` TEXT NOT NULL,
    `symptoms_text` TEXT NOT NULL,
    `care_tips_text` TEXT NOT NULL,
    `tour_order` SMALLINT NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_3d_part_views` (
    `model_3d_key` VARCHAR(64) NOT NULL,
    `part_code` VARCHAR(64) NOT NULL,
    `camera_position` JSON NOT NULL,
    `camera_target` JSON NOT NULL,
    `label_anchor` JSON NULL,

    PRIMARY KEY (`model_3d_key`, `part_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_rule_templates` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `part_code` VARCHAR(64) NOT NULL,
    `action` ENUM('replace', 'top_up', 'inspect', 'adjust', 'clean', 'lubricate', 'repair', 'other') NOT NULL,
    `category` ENUM('underbone', 'scooter', 'sport', 'trail', 'car_hatchback', 'car_sedan', 'car_mpv', 'car_suv', 'other') NULL,
    `vehicle_model_id` INTEGER UNSIGNED NULL,
    `interval_km` INTEGER UNSIGNED NULL,
    `interval_months` SMALLINT UNSIGNED NULL,
    `reset_actions` JSON NOT NULL,
    `source_note` VARCHAR(255) NOT NULL,

    INDEX `maintenance_rule_templates_part_code_idx`(`part_code`),
    INDEX `maintenance_rule_templates_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` CHAR(36) NOT NULL,
    `garage_id` CHAR(36) NOT NULL,
    `vehicle_model_id` INTEGER UNSIGNED NULL,
    `kind` ENUM('motorcycle', 'car') NOT NULL,
    `category` ENUM('underbone', 'scooter', 'sport', 'trail', 'car_hatchback', 'car_sedan', 'car_mpv', 'car_suv', 'other') NOT NULL,
    `custom_brand` VARCHAR(64) NULL,
    `custom_model` VARCHAR(100) NULL,
    `nickname` VARCHAR(60) NOT NULL,
    `plate_number` VARCHAR(20) NULL,
    `year` SMALLINT UNSIGNED NULL,
    `color` VARCHAR(40) NULL,
    `engine_cc` SMALLINT UNSIGNED NULL,
    `frame_number` VARCHAR(40) NULL,
    `engine_number` VARCHAR(40) NULL,
    `purchase_date` DATE NULL,
    `initial_odometer_km` INTEGER UNSIGNED NOT NULL,
    `current_odometer_km` INTEGER UNSIGNED NOT NULL,
    `current_odometer_at` DATETIME(3) NOT NULL,
    `model_3d_key` VARCHAR(64) NOT NULL,
    `photo_attachment_id` CHAR(36) NULL,
    `edu_tour_completed_at` DATETIME(3) NULL,
    `archived_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `vehicles_garage_id_archived_at_idx`(`garage_id`, `archived_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_maintenance_rules` (
    `id` CHAR(36) NOT NULL,
    `vehicle_id` CHAR(36) NOT NULL,
    `part_code` VARCHAR(64) NOT NULL,
    `action` ENUM('replace', 'top_up', 'inspect', 'adjust', 'clean', 'lubricate', 'repair', 'other') NOT NULL,
    `interval_km` INTEGER UNSIGNED NULL,
    `interval_months` SMALLINT UNSIGNED NULL,
    `reset_actions` JSON NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `template_id` INTEGER UNSIGNED NULL,
    `is_customized` BOOLEAN NOT NULL DEFAULT false,
    `snoozed_until` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_maintenance_rules_vehicle_id_part_code_action_key`(`vehicle_id`, `part_code`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `odometer_logs` (
    `id` CHAR(36) NOT NULL,
    `vehicle_id` CHAR(36) NOT NULL,
    `km` INTEGER UNSIGNED NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL,
    `source` ENUM('initial', 'manual', 'service') NOT NULL,
    `service_record_id` CHAR(36) NULL,
    `note` VARCHAR(255) NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `odometer_logs_service_record_id_key`(`service_record_id`),
    INDEX `odometer_logs_vehicle_id_recorded_at_idx`(`vehicle_id`, `recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workshops` (
    `id` CHAR(36) NOT NULL,
    `garage_id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `type` ENUM('official', 'general', 'self', 'other') NOT NULL DEFAULT 'general',
    `certification` ENUM('certified', 'not_certified', 'unknown') NOT NULL DEFAULT 'unknown',
    `certification_note` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `phone` VARCHAR(30) NULL,
    `latitude` DECIMAL(9, 6) NULL,
    `longitude` DECIMAL(9, 6) NULL,
    `notes` TEXT NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workshops_garage_id_idx`(`garage_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_records` (
    `id` CHAR(36) NOT NULL,
    `vehicle_id` CHAR(36) NOT NULL,
    `workshop_id` CHAR(36) NULL,
    `service_date` DATE NOT NULL,
    `odometer_km` INTEGER UNSIGNED NOT NULL,
    `mechanic_name` VARCHAR(100) NULL,
    `labor_cost` DECIMAL(12, 2) NULL,
    `total_cost` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_records_vehicle_id_service_date_idx`(`vehicle_id`, `service_date`),
    INDEX `service_records_workshop_id_idx`(`workshop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_items` (
    `id` CHAR(36) NOT NULL,
    `service_record_id` CHAR(36) NOT NULL,
    `part_code` VARCHAR(64) NULL,
    `custom_part_name` VARCHAR(100) NULL,
    `action` ENUM('replace', 'top_up', 'inspect', 'adjust', 'clean', 'lubricate', 'repair', 'other') NOT NULL,
    `product_name` VARCHAR(120) NULL,
    `quantity` DECIMAL(10, 2) NULL,
    `unit` VARCHAR(20) NULL,
    `unit_price` DECIMAL(12, 2) NULL,
    `subtotal` DECIMAL(12, 2) NULL,
    `notes` VARCHAR(255) NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,

    INDEX `service_items_part_code_idx`(`part_code`),
    INDEX `service_items_service_record_id_idx`(`service_record_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` CHAR(36) NOT NULL,
    `garage_id` CHAR(36) NOT NULL,
    `owner_type` ENUM('service_record', 'vehicle') NOT NULL,
    `owner_id` CHAR(36) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(50) NOT NULL,
    `size_bytes` INTEGER UNSIGNED NOT NULL,
    `width` SMALLINT UNSIGNED NULL,
    `height` SMALLINT UNSIGNED NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attachments_owner_type_owner_id_idx`(`owner_type`, `owner_id`),
    INDEX `attachments_garage_id_idx`(`garage_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `vehicle_id` CHAR(36) NULL,
    `rule_id` CHAR(36) NULL,
    `type` ENUM('component_soon', 'component_due', 'odometer_stale', 'system') NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `data` JSON NULL,
    `dedupe_key` VARCHAR(191) NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notifications_dedupe_key_key`(`dedupe_key`),
    INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_deliveries` (
    `id` CHAR(36) NOT NULL,
    `notification_id` CHAR(36) NOT NULL,
    `channel` ENUM('push', 'email') NOT NULL,
    `status` ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
    `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `error` VARCHAR(500) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_deliveries_notification_id_idx`(`notification_id`),
    INDEX `notification_deliveries_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_identities` ADD CONSTRAINT `user_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_tokens` ADD CONSTRAINT `push_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `garages` ADD CONSTRAINT `garages_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `garage_members` ADD CONSTRAINT `garage_members_garage_id_fkey` FOREIGN KEY (`garage_id`) REFERENCES `garages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `garage_members` ADD CONSTRAINT `garage_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_models` ADD CONSTRAINT `vehicle_models_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_models` ADD CONSTRAINT `vehicle_models_model_3d_key_fkey` FOREIGN KEY (`model_3d_key`) REFERENCES `model_3d_assets`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `model_3d_part_views` ADD CONSTRAINT `model_3d_part_views_model_3d_key_fkey` FOREIGN KEY (`model_3d_key`) REFERENCES `model_3d_assets`(`key`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `model_3d_part_views` ADD CONSTRAINT `model_3d_part_views_part_code_fkey` FOREIGN KEY (`part_code`) REFERENCES `parts`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_rule_templates` ADD CONSTRAINT `maintenance_rule_templates_part_code_fkey` FOREIGN KEY (`part_code`) REFERENCES `parts`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_rule_templates` ADD CONSTRAINT `maintenance_rule_templates_vehicle_model_id_fkey` FOREIGN KEY (`vehicle_model_id`) REFERENCES `vehicle_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_garage_id_fkey` FOREIGN KEY (`garage_id`) REFERENCES `garages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_vehicle_model_id_fkey` FOREIGN KEY (`vehicle_model_id`) REFERENCES `vehicle_models`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_model_3d_key_fkey` FOREIGN KEY (`model_3d_key`) REFERENCES `model_3d_assets`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_maintenance_rules` ADD CONSTRAINT `vehicle_maintenance_rules_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_maintenance_rules` ADD CONSTRAINT `vehicle_maintenance_rules_part_code_fkey` FOREIGN KEY (`part_code`) REFERENCES `parts`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `odometer_logs` ADD CONSTRAINT `odometer_logs_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `odometer_logs` ADD CONSTRAINT `odometer_logs_service_record_id_fkey` FOREIGN KEY (`service_record_id`) REFERENCES `service_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `odometer_logs` ADD CONSTRAINT `odometer_logs_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workshops` ADD CONSTRAINT `workshops_garage_id_fkey` FOREIGN KEY (`garage_id`) REFERENCES `garages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workshops` ADD CONSTRAINT `workshops_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_records` ADD CONSTRAINT `service_records_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_items` ADD CONSTRAINT `service_items_service_record_id_fkey` FOREIGN KEY (`service_record_id`) REFERENCES `service_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_items` ADD CONSTRAINT `service_items_part_code_fkey` FOREIGN KEY (`part_code`) REFERENCES `parts`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_garage_id_fkey` FOREIGN KEY (`garage_id`) REFERENCES `garages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_rule_id_fkey` FOREIGN KEY (`rule_id`) REFERENCES `vehicle_maintenance_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_deliveries` ADD CONSTRAINT `notification_deliveries_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
