CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_name" text DEFAULT 'Quantum FX Bot' NOT NULL,
	"support_email" text DEFAULT 'support@quantumfx.com' NOT NULL,
	"logo_url" text,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"withdrawals_enabled" boolean DEFAULT true NOT NULL,
	"deposits_enabled" boolean DEFAULT true NOT NULL,
	"min_deposit" numeric(12, 2) DEFAULT '50' NOT NULL,
	"min_withdrawal" numeric(12, 2) DEFAULT '20' NOT NULL,
	"referral_commission" numeric(6, 2) DEFAULT '10' NOT NULL,
	"payment_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "monthly_return" numeric(6, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "min_investment" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "admin_reply" text;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD COLUMN "replied_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;