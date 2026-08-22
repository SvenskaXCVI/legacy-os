ALTER TABLE `learning_cycles` ADD `eligible_observations` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_cycles` ADD `new_evidence_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_cycles` ADD `evidence_fingerprint` text;--> statement-breakpoint
ALTER TABLE `learning_cycles` ADD `knowledge_changed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_cycles` ADD `change_set_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `learning_cycles` ADD `prior_cycle_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `learning_cycles_workspace_evidence_uq` ON `learning_cycles` (`workspace_id`,`evidence_fingerprint`);--> statement-breakpoint
ALTER TABLE `patterns` ADD `evidence_hash` text;