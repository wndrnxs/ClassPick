CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`question_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`student_unread` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inquiries_thread_unique` ON `inquiries` (`assignment_id`,`student_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `inquiries_student_idx` ON `inquiries` (`student_id`);--> statement-breakpoint
CREATE TABLE `inquiry_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`inquiry_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_role` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inquiry_messages_inquiry_idx` ON `inquiry_messages` (`inquiry_id`);