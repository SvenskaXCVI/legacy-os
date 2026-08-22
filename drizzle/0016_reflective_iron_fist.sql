CREATE TABLE `realtime_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`audience` text NOT NULL,
	`client_id` text,
	`project_id` text,
	`event_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`title` text NOT NULL,
	`changed_fields_json` text DEFAULT '[]' NOT NULL,
	`correlation_id` text,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `realtime_events_id_unique` ON `realtime_events` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `realtime_events_workspace_idempotency_uq` ON `realtime_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `realtime_events_owner_cursor_idx` ON `realtime_events` (`workspace_id`,`audience`,`sequence`);--> statement-breakpoint
CREATE INDEX `realtime_events_client_cursor_idx` ON `realtime_events` (`workspace_id`,`client_id`,`audience`,`sequence`);