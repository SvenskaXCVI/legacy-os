ALTER TABLE `projects` ADD `origin_mode` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `historical_started_at` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `financial_classification` text DEFAULT 'paid' NOT NULL;