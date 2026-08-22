CREATE TABLE `automation_dead_letters` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`job_id` text NOT NULL,
	`job_type` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`payload_redacted_json` text DEFAULT '{}' NOT NULL,
	`error_summary` text NOT NULL,
	`attempts` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`replay_job_id` text,
	`replayed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `automation_jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_dead_letters_job_uq` ON `automation_dead_letters` (`job_id`);--> statement-breakpoint
CREATE INDEX `automation_dead_letters_workspace_status_idx` ON `automation_dead_letters` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `automation_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`schedule_key` text NOT NULL,
	`display_name` text NOT NULL,
	`handler_key` text NOT NULL,
	`interval_minutes` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`next_run_at` text NOT NULL,
	`last_run_at` text,
	`last_outcome` text,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_schedules_workspace_key_uq` ON `automation_schedules` (`workspace_id`,`schedule_key`);--> statement-breakpoint
CREATE INDEX `automation_schedules_due_idx` ON `automation_schedules` (`workspace_id`,`enabled`,`next_run_at`);--> statement-breakpoint
CREATE TABLE `automation_worker_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`worker_id` text NOT NULL,
	`trigger_type` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`schedules_processed` integer DEFAULT 0 NOT NULL,
	`jobs_processed` integer DEFAULT 0 NOT NULL,
	`jobs_succeeded` integer DEFAULT 0 NOT NULL,
	`jobs_failed` integer DEFAULT 0 NOT NULL,
	`leases_recovered` integer DEFAULT 0 NOT NULL,
	`playbook_steps_processed` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `automation_worker_runs_workspace_started_idx` ON `automation_worker_runs` (`workspace_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `automation_jobs` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `automation_jobs` ADD `lease_owner` text;--> statement-breakpoint
ALTER TABLE `automation_jobs` ADD `lease_expires_at` text;--> statement-breakpoint
ALTER TABLE `automation_jobs` ADD `dead_lettered_at` text;--> statement-breakpoint
ALTER TABLE `automation_jobs` ADD `replay_of_job_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `automation_jobs_workspace_idempotency_uq` ON `automation_jobs` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `automation_jobs_lease_idx` ON `automation_jobs` (`workspace_id`,`status`,`lease_expires_at`);