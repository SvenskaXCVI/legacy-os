CREATE TABLE `capture_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`client_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`channel` text NOT NULL,
	`event_type` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`title` text NOT NULL,
	`summary` text,
	`content_policy` text DEFAULT 'metadata_only' NOT NULL,
	`content_hash` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`consent_grant_id` text,
	`correlation_id` text,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'normalized' NOT NULL,
	`occurred_at` text NOT NULL,
	`captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `capture_events_workspace_idempotency_uq` ON `capture_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `capture_events_workspace_occurred_idx` ON `capture_events` (`workspace_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `capture_events_project_idx` ON `capture_events` (`project_id`);--> statement-breakpoint
CREATE INDEX `capture_events_client_idx` ON `capture_events` (`client_id`);--> statement-breakpoint
CREATE INDEX `capture_events_status_idx` ON `capture_events` (`workspace_id`,`status`);