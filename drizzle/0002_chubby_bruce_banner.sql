CREATE TABLE `automation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`job_type` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`run_after` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 5 NOT NULL,
	`locked_at` text,
	`completed_at` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `automation_jobs_queue_idx` ON `automation_jobs` (`workspace_id`,`status`,`run_after`,`priority`);--> statement-breakpoint
CREATE INDEX `automation_jobs_entity_idx` ON `automation_jobs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `consent_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`consent_type` text NOT NULL,
	`scopes_json` text DEFAULT '[]' NOT NULL,
	`purpose` text NOT NULL,
	`policy_version` text NOT NULL,
	`status` text DEFAULT 'granted' NOT NULL,
	`granted_at` text NOT NULL,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `consent_grants_client_type_idx` ON `consent_grants` (`client_id`,`consent_type`,`status`);--> statement-breakpoint
CREATE TABLE `learning_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`trigger_type` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`observations_processed` integer DEFAULT 0 NOT NULL,
	`patterns_evaluated` integer DEFAULT 0 NOT NULL,
	`patterns_promoted` integer DEFAULT 0 NOT NULL,
	`recommendations_created` integer DEFAULT 0 NOT NULL,
	`outcomes_measured` integer DEFAULT 0 NOT NULL,
	`summary` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_cycles_workspace_status_idx` ON `learning_cycles` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `learning_cycles_project_idx` ON `learning_cycles` (`project_id`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`source_type` text NOT NULL,
	`source_id` text,
	`category` text NOT NULL,
	`signal_key` text NOT NULL,
	`value_json` text DEFAULT '{}' NOT NULL,
	`quality_bps` integer DEFAULT 7000 NOT NULL,
	`consent_grant_id` text,
	`occurred_at` text NOT NULL,
	`captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `observations_workspace_signal_idx` ON `observations` (`workspace_id`,`signal_key`);--> statement-breakpoint
CREATE INDEX `observations_project_idx` ON `observations` (`project_id`);--> statement-breakpoint
CREATE INDEX `observations_client_idx` ON `observations` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `observations_source_uq` ON `observations` (`workspace_id`,`source_type`,`source_id`,`signal_key`);--> statement-breakpoint
CREATE TABLE `outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`recommendation_id` text,
	`project_id` text,
	`metric_name` text NOT NULL,
	`baseline_value` integer,
	`target_value` integer,
	`result_value` integer,
	`unit` text DEFAULT 'basis_points' NOT NULL,
	`direction` text DEFAULT 'increase' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`observation_window_days` integer DEFAULT 30 NOT NULL,
	`measured_at` text,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outcomes_recommendation_idx` ON `outcomes` (`recommendation_id`);--> statement-breakpoint
CREATE INDEX `outcomes_project_idx` ON `outcomes` (`project_id`);--> statement-breakpoint
CREATE INDEX `outcomes_status_idx` ON `outcomes` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`pattern_key` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`support_count` integer DEFAULT 0 NOT NULL,
	`distinct_projects` integer DEFAULT 0 NOT NULL,
	`distinct_clients` integer DEFAULT 0 NOT NULL,
	`effect_bps` integer DEFAULT 0 NOT NULL,
	`confidence_bps` integer DEFAULT 0 NOT NULL,
	`significance_bps` integer DEFAULT 0 NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`last_evaluated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`supersedes_pattern_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patterns_workspace_key_uq` ON `patterns` (`workspace_id`,`pattern_key`);--> statement-breakpoint
CREATE INDEX `patterns_workspace_status_idx` ON `patterns` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `patterns_confidence_idx` ON `patterns` (`confidence_bps`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`pattern_id` text,
	`project_id` text,
	`client_id` text,
	`action_type` text NOT NULL,
	`title` text NOT NULL,
	`rationale` text NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`confidence_bps` integer NOT NULL,
	`risk_level` text NOT NULL,
	`reversibility` text NOT NULL,
	`autonomy_level` text NOT NULL,
	`approval_required` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`acted_at` text,
	`dismissed_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pattern_id`) REFERENCES `patterns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recommendations_workspace_status_idx` ON `recommendations` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `recommendations_pattern_idx` ON `recommendations` (`pattern_id`);--> statement-breakpoint
CREATE INDEX `recommendations_project_idx` ON `recommendations` (`project_id`);--> statement-breakpoint
CREATE TABLE `social_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`consent_grant_id` text NOT NULL,
	`platform` text NOT NULL,
	`external_account_id` text NOT NULL,
	`handle` text,
	`account_type` text,
	`scopes_json` text DEFAULT '[]' NOT NULL,
	`encrypted_token_json` text,
	`token_expires_at` text,
	`status` text DEFAULT 'connected' NOT NULL,
	`last_synced_at` text,
	`last_cursor` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consent_grant_id`) REFERENCES `consent_grants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_connection_account_uq` ON `social_connections` (`workspace_id`,`platform`,`external_account_id`);--> statement-breakpoint
CREATE INDEX `social_connections_client_idx` ON `social_connections` (`client_id`,`status`);--> statement-breakpoint
CREATE TABLE `social_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connection_id` text NOT NULL,
	`consent_grant_id` text NOT NULL,
	`client_id` text NOT NULL,
	`project_id` text,
	`external_media_id` text NOT NULL,
	`media_type` text NOT NULL,
	`permalink_hash` text,
	`caption_summary` text,
	`tattoo_match_bps` integer DEFAULT 0 NOT NULL,
	`metrics_json` text DEFAULT '{}' NOT NULL,
	`posted_at` text,
	`observed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`connection_id`) REFERENCES `social_connections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consent_grant_id`) REFERENCES `consent_grants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_observations_media_uq` ON `social_observations` (`connection_id`,`external_media_id`);--> statement-breakpoint
CREATE INDEX `social_observations_project_idx` ON `social_observations` (`project_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `auth_subject` text;--> statement-breakpoint
ALTER TABLE `users` ADD `auth_provider` text DEFAULT 'workspace' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `client_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_required` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_subject_uq` ON `users` (`auth_subject`);--> statement-breakpoint
CREATE INDEX `users_client_idx` ON `users` (`client_id`);