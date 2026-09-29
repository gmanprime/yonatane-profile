-- Phase 12 (CP-P12.1): Forward-Link Article References
-- Creates project_article_links junction table for many-to-many project↔article linking
-- Migrates existing portfolio_items.project_item_id data into junction rows

CREATE TABLE "project_article_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_item_id" uuid NOT NULL,
	"portfolio_item_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_article_links" ADD CONSTRAINT "project_article_links_section_item_id_section_items_id_fk" FOREIGN KEY ("section_item_id") REFERENCES "public"."section_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_article_links" ADD CONSTRAINT "project_article_links_portfolio_item_id_portfolio_items_id_fk" FOREIGN KEY ("portfolio_item_id") REFERENCES "public"."portfolio_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pal_unique_link_idx" ON "project_article_links" USING btree ("section_item_id","portfolio_item_id");--> statement-breakpoint
CREATE INDEX "pal_section_item_idx" ON "project_article_links" USING btree ("section_item_id");--> statement-breakpoint
CREATE INDEX "pal_portfolio_item_idx" ON "project_article_links" USING btree ("portfolio_item_id");--> statement-breakpoint

-- Migrate existing backward FK data into junction rows (mark as primary)
INSERT INTO "project_article_links" ("section_item_id", "portfolio_item_id", "is_primary")
SELECT "project_item_id", "id", true
FROM "portfolio_items"
WHERE "project_item_id" IS NOT NULL;
