PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`text` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`scheduled_at` text,
	`story_id` text,
	`article_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "posts_state_check" CHECK("__new_posts"."state" in ('pending', 'scheduled', 'published')),
	CONSTRAINT "posts_source_check" CHECK("__new_posts"."story_id" is null or "__new_posts"."article_id" is null)
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "topic", "text", "state", "scheduled_at", "story_id", "article_id", "created_at", "updated_at") SELECT "id", "topic", "text", "state", "scheduled_at", NULL, NULL, "created_at", "updated_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;