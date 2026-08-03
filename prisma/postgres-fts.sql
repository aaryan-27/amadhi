-- Amadhi — PostgreSQL full-text search & trigram setup (production only).
-- Run once after `prisma migrate deploy` on the VPS:
--   psql $DATABASE_URL -f prisma/postgres-fts.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Generated tsvector column for listings (name + summary + address)
ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(address, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS listing_search_tsv_idx ON "Listing" USING GIN (search_tsv);

-- Trigram indexes for autocomplete (localities, listings, operators)
CREATE INDEX IF NOT EXISTS locality_name_trgm_idx ON "Locality" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listing_name_trgm_idx  ON "Listing"  USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS operator_name_trgm_idx ON "Operator" USING GIN (name gin_trgm_ops);

-- Blog search
CREATE INDEX IF NOT EXISTS blog_title_trgm_idx ON "BlogPost" USING GIN (title gin_trgm_ops);
