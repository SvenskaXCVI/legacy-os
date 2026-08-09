ALTER TABLE `workspaces` ADD `automation_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `automation_mode` text DEFAULT 'safe_auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `last_automation_at` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `last_briefing_at` text;