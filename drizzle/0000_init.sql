CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`source_note` text DEFAULT '' NOT NULL,
	`source_text` text DEFAULT '' NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`types` text DEFAULT '[]' NOT NULL,
	`content` text DEFAULT '{}' NOT NULL,
	`engine` text DEFAULT 'none' NOT NULL,
	`points_spent` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `materials_user_created_idx` ON `materials` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`order_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`amount` integer NOT NULL,
	`pencils` integer NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_key` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_id_unique` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`delta` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`reason` text NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`ref_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `point_tx_user_idx` ON `point_transactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'teacher' NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`is_guest` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);