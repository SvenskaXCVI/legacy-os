CREATE TABLE `connector_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connector_key` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text,
	`account_email` text,
	`display_name` text,
	`encrypted_credential_json` text NOT NULL,
	`granted_scopes_json` text DEFAULT '[]' NOT NULL,
	`token_expires_at` text,
	`status` text DEFAULT 'connected' NOT NULL,
	`last_refreshed_at` text,
	`last_validated_at` text,
	`last_error_summary` text,
	`connected_by` text,
	`connected_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connector_accounts_workspace_key_uq` ON `connector_accounts` (`workspace_id`,`connector_key`);--> statement-breakpoint
CREATE INDEX `connector_accounts_workspace_status_idx` ON `connector_accounts` (`workspace_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `connector_accounts_provider_account_idx` ON `connector_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `connector_oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`connector_key` text NOT NULL,
	`nonce_hash` text NOT NULL,
	`requested_by` text,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connector_oauth_states_nonce_uq` ON `connector_oauth_states` (`nonce_hash`);--> statement-breakpoint
CREATE INDEX `connector_oauth_states_workspace_expiry_idx` ON `connector_oauth_states` (`workspace_id`,`expires_at`);