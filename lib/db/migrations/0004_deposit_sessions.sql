CREATE TABLE IF NOT EXISTS "deposit_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'created',
  "amount" numeric(12,2) NOT NULL,
  "payment_method_id" varchar(100) NOT NULL,
  "payment_method_name" varchar(100) NOT NULL,
  "network" varchar(100) NOT NULL,
  "deposit_address" text NOT NULL,
  "txid" varchar(255),
  "confirmations" integer NOT NULL DEFAULT 0,
  "required_confirmations" integer NOT NULL DEFAULT 20,
  "transaction_id" integer,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
