CREATE TABLE `authority_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`tool_key` text NOT NULL,
	`task_id` text,
	`approval_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`authority_class` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text NOT NULL,
	`input_hash` text NOT NULL,
	`correlation_id` text NOT NULL,
	`policy_version` text NOT NULL,
	`evaluated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authority_decisions_workspace_task_uq` ON `authority_decisions` (`workspace_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `authority_decisions_workspace_decision_idx` ON `authority_decisions` (`workspace_id`,`decision`,`evaluated_at`);--> statement-breakpoint
CREATE INDEX `authority_decisions_tool_idx` ON `authority_decisions` (`tool_key`,`evaluated_at`);--> statement-breakpoint
CREATE INDEX `authority_decisions_approval_idx` ON `authority_decisions` (`approval_id`);--> statement-breakpoint
CREATE TABLE `tool_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`tool_key` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text NOT NULL,
	`input_schema_json` text DEFAULT '{}' NOT NULL,
	`output_schema_json` text DEFAULT '{}' NOT NULL,
	`side_effect_class` text NOT NULL,
	`approval_class` text NOT NULL,
	`retry_policy_json` text DEFAULT '{}' NOT NULL,
	`audit_behavior_json` text DEFAULT '{}' NOT NULL,
	`allowed_agents_json` text DEFAULT '[]' NOT NULL,
	`connector_key` text,
	`enabled` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`policy_version` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tool_definitions_workspace_key_uq` ON `tool_definitions` (`workspace_id`,`tool_key`);--> statement-breakpoint
CREATE INDEX `tool_definitions_workspace_authority_idx` ON `tool_definitions` (`workspace_id`,`approval_class`,`status`);--> statement-breakpoint
ALTER TABLE `agent_tasks` ADD `tool_key` text DEFAULT 'analyze_internal' NOT NULL;