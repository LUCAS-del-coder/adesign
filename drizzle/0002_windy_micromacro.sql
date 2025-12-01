CREATE TABLE `logos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`enabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `required_elements`;--> statement-breakpoint
ALTER TABLE `original_ads` ADD `country` varchar(100);