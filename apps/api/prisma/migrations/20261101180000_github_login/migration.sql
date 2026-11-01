-- AlterTable
ALTER TABLE `user_identities` MODIFY `provider` ENUM('google', 'github', 'facebook', 'apple', 'email') NOT NULL;
