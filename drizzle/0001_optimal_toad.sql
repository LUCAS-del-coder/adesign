CREATE TABLE `generated_ads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`originalAdId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`prompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `original_ads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mimeType` varchar(100),
	`analysisPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `original_ads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `required_elements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `required_elements_id` PRIMARY KEY(`id`)
);
