CREATE TABLE `club_avatars` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`style` text NOT NULL,
	`status` text NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_avatar_request` ON `club_avatars` (`user_id`,`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `club_avatar_processing` ON `club_avatars` (`status`) WHERE "club_avatars"."status"='processing';--> statement-breakpoint
CREATE INDEX `club_avatar_owner` ON `club_avatars` (`user_id`,`created`);