CREATE TABLE `agent_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_key` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`purpose` text NOT NULL,
	`capabilities_json` text DEFAULT '[]' NOT NULL,
	`allowed_scopes_json` text DEFAULT '[]' NOT NULL,
	`autonomy_policy` text DEFAULT 'internal_only' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`policy_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_definitions_workspace_key_uq` ON `agent_definitions` (`workspace_id`,`agent_key`);--> statement-breakpoint
CREATE INDEX `agent_definitions_workspace_status_idx` ON `agent_definitions` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `agent_handoffs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`task_id` text NOT NULL,
	`from_agent_key` text NOT NULL,
	`to_agent_key` text NOT NULL,
	`reason` text NOT NULL,
	`contract_version` text NOT NULL,
	`input_refs_json` text DEFAULT '[]' NOT NULL,
	`output_refs_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'accepted' NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agent_handoffs_task_idx` ON `agent_handoffs` (`task_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `agent_handoffs_workspace_agent_idx` ON `agent_handoffs` (`workspace_id`,`to_agent_key`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_key` text NOT NULL,
	`parent_task_id` text,
	`project_id` text,
	`client_id` text,
	`requested_by_type` text NOT NULL,
	`requested_by_id` text,
	`task_type` text NOT NULL,
	`title` text NOT NULL,
	`instruction_summary` text NOT NULL,
	`scope_json` text DEFAULT '{}' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`context_memory_ids_json` text DEFAULT '[]' NOT NULL,
	`risk_level` text DEFAULT 'low' NOT NULL,
	`reversibility` text DEFAULT 'reversible' NOT NULL,
	`autonomy_level` text DEFAULT 'internal_auto' NOT NULL,
	`approval_required` integer DEFAULT false NOT NULL,
	`approval_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`correlation_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`result_summary` text,
	`error_summary` text,
	`scheduled_for` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_tasks_workspace_idempotency_uq` ON `agent_tasks` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `agent_tasks_queue_idx` ON `agent_tasks` (`workspace_id`,`status`,`priority`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `agent_tasks_agent_status_idx` ON `agent_tasks` (`agent_key`,`status`);--> statement-breakpoint
CREATE INDEX `agent_tasks_project_idx` ON `agent_tasks` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `agent_tasks_client_idx` ON `agent_tasks` (`client_id`,`status`);--> statement-breakpoint
CREATE INDEX `agent_tasks_approval_idx` ON `agent_tasks` (`approval_id`);