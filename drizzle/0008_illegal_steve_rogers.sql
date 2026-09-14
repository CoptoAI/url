CREATE TABLE `oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`profile` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_provider_account_idx` ON `oauth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
ALTER TABLE `organizations` ADD `allowed_domains` text;--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `google_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `onboarding_completed` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_google_id_idx` ON `users` (`google_id`);