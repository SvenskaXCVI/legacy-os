CREATE TABLE `asset_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`asset_sha256` text NOT NULL,
	`asset_version` integer NOT NULL,
	`analysis_version` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`observations_json` text DEFAULT '[]' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`confidence_bps` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `asset_analyses_asset_idx` ON `asset_analyses` (`asset_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `asset_analyses_project_idx` ON `asset_analyses` (`project_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_analyses_asset_hash_version_uq` ON `asset_analyses` (`asset_id`,`asset_sha256`,`analysis_version`);--> statement-breakpoint
CREATE INDEX `assets_version_group_idx` ON `assets` (`version_group_id`,`version`);--> statement-breakpoint
CREATE INDEX `assets_project_role_idx` ON `assets` (`project_id`,`asset_role`);--> statement-breakpoint
PRAGMA optimize;
