CREATE TABLE `content_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`session_id` text,
	`source_asset_id` text NOT NULL,
	`title` text NOT NULL,
	`format` text DEFAULT 'portfolio' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`caption_draft` text,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`rights_status` text NOT NULL,
	`consent_status` text NOT NULL,
	`created_by_type` text DEFAULT 'agent' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`request_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `tattoo_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_candidates_workspace_request_key_uq` ON `content_candidates` (`workspace_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `content_candidates_project_status_idx` ON `content_candidates` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `content_candidates_asset_idx` ON `content_candidates` (`source_asset_id`);--> statement-breakpoint
CREATE TABLE `healing_checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`session_id` text NOT NULL,
	`checkpoint_day` integer NOT NULL,
	`scheduled_for` text NOT NULL,
	`status` text DEFAULT 'due' NOT NULL,
	`client_notes` text,
	`studio_notes` text,
	`progress_rating` integer,
	`concern_flag` integer DEFAULT false NOT NULL,
	`owner_response` text,
	`submitted_at` text,
	`reviewed_at` text,
	`request_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `tattoo_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `healing_checkins_workspace_request_key_uq` ON `healing_checkins` (`workspace_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `healing_checkins_project_schedule_idx` ON `healing_checkins` (`project_id`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `healing_checkins_client_status_idx` ON `healing_checkins` (`client_id`,`status`);--> statement-breakpoint
CREATE TABLE `tattoo_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`appointment_id` text,
	`session_number` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`started_at` text,
	`ended_at` text,
	`design_asset_id` text,
	`stencil_asset_id` text,
	`placement_snapshot` text,
	`needle_setup` text,
	`ink_setup` text,
	`technique_notes` text,
	`client_visible_summary` text,
	`duration_minutes` integer,
	`request_key` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`design_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stencil_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tattoo_sessions_workspace_request_key_uq` ON `tattoo_sessions` (`workspace_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `tattoo_sessions_project_number_idx` ON `tattoo_sessions` (`project_id`,`session_number`);--> statement-breakpoint
CREATE INDEX `tattoo_sessions_client_status_idx` ON `tattoo_sessions` (`client_id`,`status`);