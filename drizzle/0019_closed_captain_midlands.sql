CREATE TABLE `specialist_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`task_id` text NOT NULL,
	`ai_run_id` text NOT NULL,
	`agent_key` text NOT NULL,
	`domain` text NOT NULL,
	`capability_key` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`policy_version` text NOT NULL,
	`summary` text NOT NULL,
	`facts_json` text DEFAULT '{}' NOT NULL,
	`findings_json` text DEFAULT '[]' NOT NULL,
	`recommendations_json` text DEFAULT '[]' NOT NULL,
	`evidence_json` text DEFAULT '[]' NOT NULL,
	`limitations_json` text DEFAULT '[]' NOT NULL,
	`confidence_bps` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `agent_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ai_run_id`) REFERENCES `ai_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `specialist_evaluations_task_uq` ON `specialist_evaluations` (`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `specialist_evaluations_ai_run_uq` ON `specialist_evaluations` (`ai_run_id`);--> statement-breakpoint
CREATE INDEX `specialist_evaluations_workspace_domain_idx` ON `specialist_evaluations` (`workspace_id`,`domain`,`created_at`);--> statement-breakpoint
CREATE INDEX `specialist_evaluations_project_idx` ON `specialist_evaluations` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `specialist_evaluations_client_idx` ON `specialist_evaluations` (`client_id`,`created_at`);