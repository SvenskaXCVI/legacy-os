CREATE TABLE `ai_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_events_run_sequence_uq` ON `ai_events` (`run_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `ai_events_workspace_type_idx` ON `ai_events` (`workspace_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`parent_run_id` text,
	`correlation_id` text NOT NULL,
	`agent_name` text NOT NULL,
	`purpose` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`context_policy_version` text NOT NULL,
	`approval_policy_version` text NOT NULL,
	`risk_level` text NOT NULL,
	`content_capture` text DEFAULT 'metadata_only' NOT NULL,
	`input_hash` text,
	`reasoning_summary` text,
	`recommendation` text,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`confidence_bps` integer,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` text,
	`completed_at` text,
	`latency_ms` integer,
	`error_code` text,
	`error_summary` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_runs_correlation_uq` ON `ai_runs` (`workspace_id`,`correlation_id`);--> statement-breakpoint
CREATE INDEX `ai_runs_workspace_status_idx` ON `ai_runs` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `ai_runs_project_idx` ON `ai_runs` (`project_id`);--> statement-breakpoint
CREATE INDEX `ai_runs_agent_created_idx` ON `ai_runs` (`agent_name`,`created_at`);--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`requested_by_type` text NOT NULL,
	`requested_by_id` text,
	`category` text NOT NULL,
	`action_type` text NOT NULL,
	`subject` text NOT NULL,
	`summary` text NOT NULL,
	`payload_hash` text NOT NULL,
	`payload_redacted_json` text DEFAULT '{}' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`risk_level` text NOT NULL,
	`reversibility` text NOT NULL,
	`confidence_bps` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`decision_by` text,
	`decision_reason` text,
	`decided_at` text,
	`expires_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `approvals_workspace_status_idx` ON `approvals` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `approvals_project_idx` ON `approvals` (`project_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`storage_key` text NOT NULL,
	`original_name` text NOT NULL,
	`media_type` text NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`version` integer DEFAULT 1 NOT NULL,
	`extraction_status` text DEFAULT 'pending' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_storage_key_uq` ON `assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `assets_project_idx` ON `assets` (`project_id`);--> statement-breakpoint
CREATE INDEX `assets_hash_idx` ON `assets` (`sha256`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`risk_level` text DEFAULT 'low' NOT NULL,
	`outcome` text NOT NULL,
	`correlation_id` text,
	`ip_hash` text,
	`user_agent_hash` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_workspace_occurred_idx` ON `audit_events` (`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_events` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_correlation_idx` ON `audit_events` (`correlation_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text,
	`phone` text,
	`preferred_channel` text,
	`status` text DEFAULT 'active' NOT NULL,
	`consent_status` text DEFAULT 'unknown' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `clients_workspace_idx` ON `clients` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `clients_email_idx` ON `clients` (`email`);--> statement-breakpoint
CREATE INDEX `clients_phone_idx` ON `clients` (`phone`);--> statement-breakpoint
CREATE TABLE `knowledge_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`from_item_id` text NOT NULL,
	`to_item_id` text NOT NULL,
	`relationship` text NOT NULL,
	`weight_bps` integer DEFAULT 5000 NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_item_id`) REFERENCES `knowledge_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_edge_uq` ON `knowledge_edges` (`from_item_id`,`to_item_id`,`relationship`);--> statement-breakpoint
CREATE INDEX `knowledge_edges_workspace_idx` ON `knowledge_edges` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `knowledge_items` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`source_asset_id` text,
	`item_type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`content_hash` text NOT NULL,
	`summary` text,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`confidence_bps` integer,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`visibility` text DEFAULT 'workspace' NOT NULL,
	`valid_from` text,
	`valid_to` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `knowledge_workspace_type_idx` ON `knowledge_items` (`workspace_id`,`item_type`);--> statement-breakpoint
CREATE INDEX `knowledge_project_idx` ON `knowledge_items` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_content_hash_uq` ON `knowledge_items` (`workspace_id`,`content_hash`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text,
	`project_id` text,
	`severity` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`action_url` text,
	`dedupe_key` text,
	`status` text DEFAULT 'unread' NOT NULL,
	`deliver_after` text,
	`read_at` text,
	`dismissed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_status_idx` ON `notifications` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_dedupe_uq` ON `notifications` (`workspace_id`,`dedupe_key`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text,
	`title` text NOT NULL,
	`project_type` text DEFAULT 'tattoo' NOT NULL,
	`lifecycle_phase` text DEFAULT 'lead' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`placement` text,
	`size_description` text,
	`style_tags_json` text DEFAULT '[]' NOT NULL,
	`budget_min_cents` integer,
	`budget_max_cents` integer,
	`target_date` text,
	`next_action` text,
	`next_action_at` text,
	`summary` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_workspace_phase_idx` ON `projects` (`workspace_id`,`lifecycle_phase`);--> statement-breakpoint
CREATE INDEX `projects_client_idx` ON `projects` (`client_id`);--> statement-breakpoint
CREATE INDEX `projects_next_action_idx` ON `projects` (`next_action_at`);--> statement-breakpoint
CREATE TABLE `tool_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text NOT NULL,
	`approval_id` text,
	`tool_name` text NOT NULL,
	`operation` text NOT NULL,
	`destination` text,
	`parameters_hash` text,
	`parameters_redacted_json` text DEFAULT '{}' NOT NULL,
	`result_summary` text,
	`external_side_effect` integer DEFAULT false NOT NULL,
	`status` text NOT NULL,
	`latency_ms` integer,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tool_calls_run_idx` ON `tool_calls` (`run_id`);--> statement-breakpoint
CREATE INDEX `tool_calls_side_effect_idx` ON `tool_calls` (`workspace_id`,`external_side_effect`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cached_input_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_micros` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`pricing_version` text,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `usage_workspace_occurred_idx` ON `usage_events` (`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `usage_run_idx` ON `usage_events` (`run_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_workspace_email_uq` ON `users` (`workspace_id`,`email`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain_type` text DEFAULT 'tattoo' NOT NULL,
	`timezone` text DEFAULT 'America/Los_Angeles' NOT NULL,
	`ai_content_capture` text DEFAULT 'metadata_only' NOT NULL,
	`retention_days` integer DEFAULT 90 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `workspaces`
	(`id`, `name`, `domain_type`, `timezone`, `ai_content_capture`, `retention_days`)
VALUES
	('legacy-lines', 'Legacy Lines', 'tattoo', 'America/Los_Angeles', 'metadata_only', 90)
ON CONFLICT (`id`) DO NOTHING;
