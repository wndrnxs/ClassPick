CREATE TABLE `exam_starts` (
	`assignment_id` text NOT NULL,
	`student_id` text NOT NULL,
	`started_at` integer NOT NULL,
	PRIMARY KEY(`assignment_id`, `student_id`),
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD `time_limit_min` integer;--> statement-breakpoint
ALTER TABLE `submissions` ADD `timings` text DEFAULT '{}' NOT NULL;