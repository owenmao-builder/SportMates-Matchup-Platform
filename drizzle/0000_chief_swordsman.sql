CREATE TABLE `club_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`password` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_accounts_phone_unique` ON `club_accounts` (`phone`);--> statement-breakpoint
CREATE TABLE `club_community` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `club_limits_expiry` ON `club_limits` (`expires`);--> statement-breakpoint
CREATE TABLE `club_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `club_sessions_expiry` ON `club_sessions` (`expires`);