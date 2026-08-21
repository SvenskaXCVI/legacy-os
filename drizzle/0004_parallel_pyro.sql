ALTER TABLE `approvals` ADD `asset_id` text REFERENCES assets(id);--> statement-breakpoint
ALTER TABLE `approvals` ADD `asset_sha256` text;--> statement-breakpoint
ALTER TABLE `approvals` ADD `asset_version` integer;--> statement-breakpoint
ALTER TABLE `approvals` ADD `audience` text DEFAULT 'owner' NOT NULL;--> statement-breakpoint
CREATE INDEX `approvals_asset_idx` ON `approvals` (`asset_id`);--> statement-breakpoint
CREATE INDEX `approvals_project_audience_idx` ON `approvals` (`project_id`,`audience`);--> statement-breakpoint
ALTER TABLE `assets` ADD `version_group_id` text;--> statement-breakpoint
ALTER TABLE `assets` ADD `parent_asset_id` text;--> statement-breakpoint
ALTER TABLE `assets` ADD `asset_role` text DEFAULT 'unspecified' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `visibility` text DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `rights_status` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `consent_status` text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `content_eligible` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `assets` SET `version_group_id` = `id` WHERE `version_group_id` IS NULL;--> statement-breakpoint
UPDATE `assets` SET `visibility` = 'client_shared', `asset_role` = 'reference', `rights_status` = 'client_provided' WHERE `source_type` = 'client_upload';--> statement-breakpoint
UPDATE `assets` SET `asset_role` = 'design_iteration', `rights_status` = 'studio_created' WHERE `source_type` = 'owner_upload';--> statement-breakpoint
CREATE INDEX `assets_project_visibility_idx` ON `assets` (`project_id`,`visibility`);--> statement-breakpoint
CREATE INDEX `assets_content_eligible_idx` ON `assets` (`workspace_id`,`content_eligible`);--> statement-breakpoint
ALTER TABLE `projects` ADD `client_summary` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `is_test` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_workspace_request_key_uq` ON `projects` (`workspace_id`,`request_key`);--> statement-breakpoint
PRAGMA optimize;
