CREATE TABLE `connector_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connector_key` text NOT NULL,
	`display_name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`capabilities_json` text DEFAULT '[]' NOT NULL,
	`credential_state` text DEFAULT 'not_required' NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`health_status` text DEFAULT 'unknown' NOT NULL,
	`last_checked_at` text,
	`last_success_at` text,
	`last_error_summary` text,
	`policy_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connector_definitions_workspace_key_uq` ON `connector_definitions` (`workspace_id`,`connector_key`);--> statement-breakpoint
CREATE INDEX `connector_definitions_workspace_status_idx` ON `connector_definitions` (`workspace_id`,`status`,`health_status`);--> statement-breakpoint
CREATE TABLE `connector_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connector_key` text NOT NULL,
	`task_id` text,
	`approval_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action_type` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`request_redacted_json` text DEFAULT '{}' NOT NULL,
	`external_reference` text,
	`result_summary` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`error_summary` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connector_executions_workspace_idempotency_uq` ON `connector_executions` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `connector_executions_workspace_status_idx` ON `connector_executions` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `connector_executions_task_idx` ON `connector_executions` (`task_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `connector_executions_connector_idx` ON `connector_executions` (`connector_key`,`created_at`);--> statement-breakpoint
ALTER TABLE `agent_tasks` ADD `action_payload_json` text DEFAULT '{}' NOT NULL;