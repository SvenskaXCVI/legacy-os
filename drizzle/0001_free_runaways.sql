CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text,
	`project_id` text,
	`appointment_type` text DEFAULT 'session' NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`location` text,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appointments_workspace_start_idx` ON `appointments` (`workspace_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `appointments_client_idx` ON `appointments` (`client_id`);--> statement-breakpoint
CREATE INDEX `appointments_project_idx` ON `appointments` (`project_id`);--> statement-breakpoint
CREATE TABLE `client_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`project_id` text,
	`sender_type` text NOT NULL,
	`sender_id` text,
	`body` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `client_messages_client_created_idx` ON `client_messages` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `client_messages_project_idx` ON `client_messages` (`project_id`);--> statement-breakpoint
CREATE TABLE `portal_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`token_hint` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text NOT NULL,
	`last_used_at` text,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_invitations_token_uq` ON `portal_invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `portal_invitations_client_idx` ON `portal_invitations` (`client_id`,`status`);--> statement-breakpoint
CREATE TABLE `project_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`visibility` text DEFAULT 'client' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_updates_project_created_idx` ON `project_updates` (`project_id`,`created_at`);