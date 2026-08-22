CREATE TABLE `project_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`requested_title` text NOT NULL,
	`placement` text,
	`size_description` text,
	`style_tags_json` text DEFAULT '[]' NOT NULL,
	`concept` text NOT NULL,
	`references_summary` text,
	`constraints` text,
	`budget_min_cents` integer,
	`budget_max_cents` integer,
	`target_date` text,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`confidence_bps` integer DEFAULT 0 NOT NULL,
	`extraction_method` text DEFAULT 'legacy-intake-v1' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`proposed_project_id` text,
	`client_response` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`submitted_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposed_project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_candidates_workspace_source_uq` ON `project_candidates` (`workspace_id`,`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `project_candidates_workspace_status_idx` ON `project_candidates` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `project_candidates_client_idx` ON `project_candidates` (`client_id`);--> statement-breakpoint
ALTER TABLE `clients` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `preferred_name` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `instagram_handle` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `tiktok_handle` text;--> statement-breakpoint
ALTER TABLE `clients` ADD `source_type` text DEFAULT 'owner_entry' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `identity_status` text DEFAULT 'partial' NOT NULL;--> statement-breakpoint
UPDATE `clients`
SET `display_name` = trim(`first_name` || ' ' || `last_name`)
WHERE `display_name` IS NULL;--> statement-breakpoint
UPDATE `clients`
SET `identity_status` = CASE
	WHEN `email` IS NOT NULL OR `phone` IS NOT NULL THEN 'contactable'
	ELSE 'partial'
END;--> statement-breakpoint
PRAGMA optimize;
