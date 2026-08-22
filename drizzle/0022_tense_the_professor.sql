CREATE TABLE `availability_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`window_type` text DEFAULT 'tattoo' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`energy_capacity` text DEFAULT 'high' NOT NULL,
	`location` text,
	`notes` text,
	`source` text DEFAULT 'owner' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `availability_windows_workspace_status_start_idx` ON `availability_windows` (`workspace_id`,`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `project_schedule_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`estimated_session_minutes` integer NOT NULL,
	`prep_minutes` integer,
	`travel_minutes` integer,
	`buffer_before_minutes` integer,
	`buffer_after_minutes` integer,
	`energy_demand` text DEFAULT 'high' NOT NULL,
	`minimum_revenue_cents` integer DEFAULT 0 NOT NULL,
	`earliest_start` text,
	`latest_end` text,
	`location` text,
	`notes` text,
	`status` text DEFAULT 'active' NOT NULL,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_schedule_requirements_project_uq` ON `project_schedule_requirements` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_schedule_requirements_workspace_status_idx` ON `project_schedule_requirements` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `schedule_evaluation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`windows_evaluated` integer DEFAULT 0 NOT NULL,
	`projects_evaluated` integer DEFAULT 0 NOT NULL,
	`ready_projects` integer DEFAULT 0 NOT NULL,
	`opportunities_created` integer DEFAULT 0 NOT NULL,
	`conflicts_detected` integer DEFAULT 0 NOT NULL,
	`projected_revenue_cents` integer DEFAULT 0 NOT NULL,
	`summary` text NOT NULL,
	`policy_version` text NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`initiated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `schedule_evaluation_runs_workspace_created_idx` ON `schedule_evaluation_runs` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `schedule_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text NOT NULL,
	`window_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`suggested_starts_at` text NOT NULL,
	`suggested_ends_at` text NOT NULL,
	`reserved_from` text NOT NULL,
	`reserved_until` text NOT NULL,
	`readiness_bps` integer NOT NULL,
	`fit_bps` integer NOT NULL,
	`projected_revenue_cents` integer DEFAULT 0 NOT NULL,
	`energy_demand` text NOT NULL,
	`rationale` text NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`approval_required` integer DEFAULT true NOT NULL,
	`task_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `schedule_evaluation_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`window_id`) REFERENCES `availability_windows`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_opportunities_run_window_project_uq` ON `schedule_opportunities` (`run_id`,`window_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `schedule_opportunities_workspace_status_idx` ON `schedule_opportunities` (`workspace_id`,`status`,`suggested_starts_at`);--> statement-breakpoint
CREATE INDEX `schedule_opportunities_run_idx` ON `schedule_opportunities` (`run_id`);--> statement-breakpoint
CREATE TABLE `scheduling_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`default_prep_minutes` integer DEFAULT 60 NOT NULL,
	`default_travel_minutes` integer DEFAULT 0 NOT NULL,
	`default_buffer_before_minutes` integer DEFAULT 30 NOT NULL,
	`default_buffer_after_minutes` integer DEFAULT 30 NOT NULL,
	`maximum_tattoo_minutes_per_day` integer DEFAULT 480 NOT NULL,
	`maximum_high_energy_sessions_per_day` integer DEFAULT 1 NOT NULL,
	`minimum_bookable_minutes` integer DEFAULT 120 NOT NULL,
	`weekly_revenue_target_cents` integer DEFAULT 0 NOT NULL,
	`policy_version` text NOT NULL,
	`updated_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduling_profiles_workspace_uq` ON `scheduling_profiles` (`workspace_id`);