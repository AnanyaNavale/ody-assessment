CREATE TYPE "public"."dietary_tag" AS ENUM('vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'spicy');--> statement-breakpoint
CREATE TABLE "menu_item_dietary_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"tag" "dietary_tag" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prep_time_minutes" integer DEFAULT 15 NOT NULL,
	"auto_accept_orders" boolean DEFAULT true NOT NULL,
	"service_available" boolean DEFAULT true NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.0800' NOT NULL,
	"opening_time" text,
	"closing_time" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "settings" CASCADE;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "ingredients" text;--> statement-breakpoint
ALTER TABLE "menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_dietary_tags_item_tag_idx" ON "menu_item_dietary_tags" USING btree ("menu_item_id","tag");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");