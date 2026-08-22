CREATE TABLE `memory_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`scope_type` text NOT NULL,
	`scope_key` text NOT NULL,
	`memory_key` text NOT NULL,
	`memory_type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`source_capture_ids_json` text DEFAULT '[]' NOT NULL,
	`confidence_bps` integer DEFAULT 7000 NOT NULL,
	`sensitivity` text DEFAULT 'internal' NOT NULL,
	`verification_status` text DEFAULT 'system_derived' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`supersedes_memory_id` text,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`last_reinforced_at` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_records_scope_key_version_uq` ON `memory_records` (`workspace_id`,`scope_key`,`memory_key`,`version`);--> statement-breakpoint
CREATE INDEX `memory_records_scope_status_idx` ON `memory_records` (`workspace_id`,`scope_key`,`status`);--> statement-breakpoint
CREATE INDEX `memory_records_project_idx` ON `memory_records` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `memory_records_client_idx` ON `memory_records` (`client_id`,`status`);--> statement-breakpoint
CREATE INDEX `memory_records_confidence_idx` ON `memory_records` (`workspace_id`,`status`,`confidence_bps`);