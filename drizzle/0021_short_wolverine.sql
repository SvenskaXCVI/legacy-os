CREATE TABLE `craft_analysis_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`eligible_sessions` integer DEFAULT 0 NOT NULL,
	`combinations_evaluated` integer DEFAULT 0 NOT NULL,
	`candidate_patterns` integer DEFAULT 0 NOT NULL,
	`promoted_patterns` integer DEFAULT 0 NOT NULL,
	`summary` text NOT NULL,
	`policy_version` text NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`initiated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `craft_analysis_runs_workspace_created_idx` ON `craft_analysis_runs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `healing_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`checkin_id` text NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`healing_phase` text NOT NULL,
	`retention_rating` integer,
	`saturation_rating` integer,
	`line_quality_rating` integer,
	`smoothness_rating` integer,
	`healed_outcome_rating` integer NOT NULL,
	`touchup_required` integer DEFAULT false NOT NULL,
	`owner_assessment` text NOT NULL,
	`client_feedback_summary` text,
	`photo_asset_ids_json` text DEFAULT '[]' NOT NULL,
	`assessed_by` text,
	`assessed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checkin_id`) REFERENCES `healing_checkins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `tattoo_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `healing_assessments_checkin_uq` ON `healing_assessments` (`checkin_id`);--> statement-breakpoint
CREATE INDEX `healing_assessments_workspace_phase_idx` ON `healing_assessments` (`workspace_id`,`healing_phase`);--> statement-breakpoint
CREATE INDEX `healing_assessments_session_idx` ON `healing_assessments` (`session_id`);--> statement-breakpoint
CREATE INDEX `healing_assessments_project_idx` ON `healing_assessments` (`project_id`);--> statement-breakpoint
CREATE TABLE `session_craft_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`machine_name` text,
	`machine_type` text,
	`needle_groupings_json` text DEFAULT '[]' NOT NULL,
	`ink_wash_json` text DEFAULT '[]' NOT NULL,
	`voltage_min_mv` integer,
	`voltage_max_mv` integer,
	`techniques_json` text DEFAULT '[]' NOT NULL,
	`body_area` text,
	`skin_response` text,
	`client_response` text,
	`fresh_outcome_rating` integer,
	`owner_assessment` text,
	`fresh_asset_ids_json` text DEFAULT '[]' NOT NULL,
	`completeness_bps` integer DEFAULT 0 NOT NULL,
	`recorded_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `tattoo_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_craft_records_session_uq` ON `session_craft_records` (`session_id`);--> statement-breakpoint
CREATE INDEX `session_craft_records_workspace_quality_idx` ON `session_craft_records` (`workspace_id`,`completeness_bps`);--> statement-breakpoint
CREATE INDEX `session_craft_records_project_idx` ON `session_craft_records` (`project_id`);