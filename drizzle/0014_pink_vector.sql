CREATE TABLE `automation_playbook_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`playbook_key` text NOT NULL,
	`source_capture_id` text,
	`source_event_type` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`correlation_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`total_steps` integer DEFAULT 0 NOT NULL,
	`completed_steps` integer DEFAULT 0 NOT NULL,
	`held_steps` integer DEFAULT 0 NOT NULL,
	`failed_steps` integer DEFAULT 0 NOT NULL,
	`summary` text,
	`error_summary` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_capture_id`) REFERENCES `capture_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_playbook_runs_workspace_idempotency_uq` ON `automation_playbook_runs` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `automation_playbook_runs_workspace_status_idx` ON `automation_playbook_runs` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `automation_playbook_runs_project_idx` ON `automation_playbook_runs` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `automation_playbook_runs_source_idx` ON `automation_playbook_runs` (`source_capture_id`);--> statement-breakpoint
CREATE TABLE `automation_playbook_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`step_key` text NOT NULL,
	`title` text NOT NULL,
	`agent_key` text NOT NULL,
	`task_id` text,
	`action_type` text NOT NULL,
	`approval_required` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`result_summary` text,
	`error_summary` text,
	`scheduled_for` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `automation_playbook_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_playbook_steps_run_sequence_uq` ON `automation_playbook_steps` (`run_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `automation_playbook_steps_workspace_status_idx` ON `automation_playbook_steps` (`workspace_id`,`status`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `automation_playbook_steps_task_idx` ON `automation_playbook_steps` (`task_id`);--> statement-breakpoint
CREATE TABLE `automation_playbooks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`playbook_key` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text NOT NULL,
	`trigger_events_json` text DEFAULT '[]' NOT NULL,
	`steps_json` text DEFAULT '[]' NOT NULL,
	`autonomy_mode` text DEFAULT 'safe_auto' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`policy_version` text NOT NULL,
	`last_triggered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_playbooks_workspace_key_uq` ON `automation_playbooks` (`workspace_id`,`playbook_key`);--> statement-breakpoint
CREATE INDEX `automation_playbooks_workspace_enabled_idx` ON `automation_playbooks` (`workspace_id`,`enabled`,`status`);