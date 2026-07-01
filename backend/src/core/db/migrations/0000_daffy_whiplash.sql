CREATE TABLE `example` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`example_column` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
