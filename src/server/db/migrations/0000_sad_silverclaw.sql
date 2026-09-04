CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('tiktok', 'instagram', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'creator');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"platforms" "platform"[] NOT NULL,
	"payout_per_1k_views" integer NOT NULL,
	"total_budget" integer NOT NULL,
	"spent_budget" integer DEFAULT 0 NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"captured_at" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "submission_metric_date_unique" UNIQUE("submission_id","captured_at")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"post_url" text NOT NULL,
	"platform" "platform" NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_post_url_unique" UNIQUE("campaign_id","post_url")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "submission_metrics" ADD CONSTRAINT "submission_metrics_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submission_creator_idx" ON "submissions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "submission_campaign_status_idx" ON "submissions" USING btree ("campaign_id","status");