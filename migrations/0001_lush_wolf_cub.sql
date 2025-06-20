CREATE TABLE "message_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'rich-text' NOT NULL,
	"workflow" text,
	"word_count" integer DEFAULT 0,
	"character_count" integer DEFAULT 0,
	"html_length" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redis_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "redis_cache_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "redis_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_data" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_documents" ADD CONSTRAINT "message_documents_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;