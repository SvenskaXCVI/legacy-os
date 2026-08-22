CREATE TABLE `payment_customers` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`client_id` text NOT NULL,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`external_customer_id` text NOT NULL,
	`email_at_link` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_customers_workspace_client_provider_uq` ON `payment_customers` (`workspace_id`,`client_id`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_customers_external_uq` ON `payment_customers` (`external_customer_id`);--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`payment_request_id` text,
	`provider` text DEFAULT 'stripe' NOT NULL,
	`external_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`external_object_id` text,
	`status` text DEFAULT 'received' NOT NULL,
	`amount_cents` integer,
	`currency` text,
	`payload_digest` text NOT NULL,
	`error` text,
	`processed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_request_id`) REFERENCES `payment_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_events_external_uq` ON `payment_events` (`external_event_id`);--> statement-breakpoint
CREATE INDEX `payment_events_request_idx` ON `payment_events` (`payment_request_id`);--> statement-breakpoint
CREATE INDEX `payment_events_status_idx` ON `payment_events` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`client_id` text NOT NULL,
	`kind` text DEFAULT 'deposit' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`amount_paid_cents` integer DEFAULT 0 NOT NULL,
	`amount_refunded_cents` integer DEFAULT 0 NOT NULL,
	`due_at` text,
	`request_key` text NOT NULL,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`checkout_url` text,
	`checkout_expires_at` text,
	`checkout_attempt` integer DEFAULT 0 NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`paid_at` text,
	`refunded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_requests_workspace_key_uq` ON `payment_requests` (`workspace_id`,`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_requests_checkout_session_uq` ON `payment_requests` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE INDEX `payment_requests_workspace_status_idx` ON `payment_requests` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `payment_requests_client_status_idx` ON `payment_requests` (`client_id`,`status`);--> statement-breakpoint
CREATE INDEX `payment_requests_project_idx` ON `payment_requests` (`project_id`);--> statement-breakpoint
CREATE INDEX `payment_requests_intent_idx` ON `payment_requests` (`stripe_payment_intent_id`);