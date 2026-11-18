CREATE TYPE "public"."ai_run_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ai_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."budget_range" AS ENUM('lt_10m', '10m_25m', '25m_50m', '50m_100m', 'gt_100m');--> statement-breakpoint
CREATE TYPE "public"."pipeline_status" AS ENUM('new', 'contacted', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('High', 'Medium', 'Low');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('Branding', 'Website', 'Mobile App', 'AI Automation', 'Social Media', 'Lainnya');--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"status" "ai_run_status" NOT NULL,
	"model" text NOT NULL,
	"raw_output" text,
	"error" text,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "briefs_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company_name" text NOT NULL,
	"needs" text NOT NULL,
	"budget_range" "budget_range" NOT NULL,
	"target_date" date NOT NULL,
	"pipeline_status" "pipeline_status" DEFAULT 'new' NOT NULL,
	"ai_status" "ai_status" DEFAULT 'pending' NOT NULL,
	"ai_result" jsonb,
	"service_category" "service_category",
	"priority" "priority",
	"ai_error" text,
	"ai_attempts" integer DEFAULT 0 NOT NULL,
	"ai_started_at" timestamp with time zone,
	"ai_processed_at" timestamp with time zone,
	"email_draft" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "briefs_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "pipeline_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"from_status" "pipeline_status",
	"to_status" "pipeline_status" NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_status_history" ADD CONSTRAINT "pipeline_status_history_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_status_history" ADD CONSTRAINT "pipeline_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_brief_id_created_at_idx" ON "ai_runs" USING btree ("brief_id","created_at");--> statement-breakpoint
CREATE INDEX "briefs_created_at_idx" ON "briefs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "briefs_priority_idx" ON "briefs" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "briefs_service_category_idx" ON "briefs" USING btree ("service_category");--> statement-breakpoint
CREATE INDEX "briefs_ai_status_idx" ON "briefs" USING btree ("ai_status");--> statement-breakpoint
CREATE INDEX "pipeline_history_brief_id_created_at_idx" ON "pipeline_status_history" USING btree ("brief_id","created_at");