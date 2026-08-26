ALTER TABLE `appointments` ADD `request_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `appointments_workspace_request_key_uq` ON `appointments` (`workspace_id`,`request_key`);