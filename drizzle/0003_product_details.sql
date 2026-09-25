ALTER TABLE "products" ADD COLUMN "calories_kcal" integer;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pieces_count" integer;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "included_items" jsonb DEFAULT '[]'::jsonb NOT NULL;
