CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`text` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "posts_state_check" CHECK("posts"."state" in ('pending', 'scheduled', 'published'))
);
