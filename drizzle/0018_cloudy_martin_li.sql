CREATE TABLE `chief_manager_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`ai_run_id` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`requested_by` text NOT NULL,
	`objective` text NOT NULL,
	`mode` text DEFAULT 'command' NOT NULL,
	`status` text DEFAULT 'planning' NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`plan_version` text NOT NULL,
	`context_policy_version` text NOT NULL,
	`authority_policy_version` text NOT NULL,
	`plan_json` text DEFAULT '{}' NOT NULL,
	`context_refs_json` text DEFAULT '[]' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`summary` text,
	`next_action` text,
	`confidence_bps` integer,
	`correlation_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ai_run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chief_manager_runs_workspace_idempotency_uq` ON `chief_manager_runs` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `chief_manager_runs_ai_run_uq` ON `chief_manager_runs` (`ai_run_id`);--> statement-breakpoint
CREATE INDEX `chief_manager_runs_workspace_status_idx` ON `chief_manager_runs` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `chief_manager_runs_project_idx` ON `chief_manager_runs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `chief_manager_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`manager_run_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`agent_key` text NOT NULL,
	`title` text NOT NULL,
	`purpose` text NOT NULL,
	`tool_key` text NOT NULL,
	`task_id` text,
	`approval_id` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`result_summary` text,
	`error_summary` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_run_id`) REFERENCES `chief_manager_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chief_manager_steps_run_sequence_uq` ON `chief_manager_steps` (`manager_run_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `chief_manager_steps_workspace_status_idx` ON `chief_manager_steps` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `chief_manager_steps_task_idx` ON `chief_manager_steps` (`task_id`);--> statement-breakpoint
CREATE INDEX `chief_manager_steps_approval_idx` ON `chief_manager_steps` (`approval_id`);--> statement-breakpoint
ALTER TABLE `agent_tasks` ADD `parent_run_id` text REFERENCES ai_runs(id);--> statement-breakpoint
CREATE INDEX `agent_tasks_parent_run_idx` ON `agent_tasks` (`parent_run_id`,`created_at`);