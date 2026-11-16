CREATE TABLE "refresh_token" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_token_user_id_index" ON "refresh_token" USING btree ("user_id");--> statement-breakpoint
-- Keep existing logins: Better Auth stored the scrypt hash on the "credential" account.
UPDATE "user" SET "password_hash" = "account"."password" FROM "account" WHERE "account"."user_id" = "user"."id" AND "account"."provider_id" = 'credential';
--> statement-breakpoint
-- Users without a password (none expected outside tests) get an empty hash, which never verifies.
UPDATE "user" SET "password_hash" = '' WHERE "password_hash" IS NULL;
