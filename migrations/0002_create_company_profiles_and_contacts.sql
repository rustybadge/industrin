-- Safe migration: create company_profiles and contacts tables only.
-- Does NOT alter any existing tables or columns.
-- Idempotent: safe to re-run (IF NOT EXISTS guards both CREATE TABLE statements).
--
-- Run against Neon:
--   psql $DATABASE_URL -f migrations/0002_create_company_profiles_and_contacts.sql

BEGIN;

CREATE TABLE IF NOT EXISTS company_profiles (
  id               varchar        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       varchar        NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  visiting_address text,
  postal_address   text,
  opening_hours    text,
  created_at       timestamp      DEFAULT now(),
  updated_at       timestamp      DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id          varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  varchar   NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text      NOT NULL,
  phone       text,
  email       text,
  sort_order  integer   DEFAULT 0,
  created_at  timestamp DEFAULT now()
);

COMMIT;
