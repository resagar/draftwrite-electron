CREATE TABLE `tag_metadata` (
	`name` text PRIMARY KEY NOT NULL,
	`color` text DEFAULT 'default' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `tags` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `tags` text DEFAULT '' NOT NULL;