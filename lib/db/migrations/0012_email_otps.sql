CREATE TABLE IF NOT EXISTS "email_otps" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "otp" varchar(6) NOT NULL,
  "user_id" integer,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
