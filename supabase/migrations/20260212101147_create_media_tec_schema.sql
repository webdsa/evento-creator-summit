/*
  # Mídia Tec Event Registration System Schema

  ## Overview
  Complete database schema for single-event registration system with voucher-based
  institution quotas, concurrency-safe registration, and email deduplication.

  ## New Tables

  1. **institutions**
     - id (uuid, primary key)
     - name (text, unique, not null)
     - quota_total (integer, not null, >= 0)
     - used_count (integer, not null, default 0, >= 0)
     - status (text, check constraint: 'active' or 'inactive')
     - created_at (timestamptz, default now())
     - updated_at (timestamptz, default now())
     - Constraint: used_count <= quota_total

  2. **vouchers**
     - id (uuid, primary key)
     - code (text, unique, not null, uppercase)
     - institution_id (uuid, foreign key to institutions)
     - quota_total (integer, not null, >= 0)
     - used_count (integer, not null, default 0, >= 0)
     - status (text, check constraint: 'active' or 'paused')
     - expires_at (timestamptz, nullable)
     - created_at (timestamptz, default now())
     - updated_at (timestamptz, default now())
     - Constraint: used_count <= quota_total

  3. **voucher_codes**
     - code (text, primary key, uppercase)
     - voucher_id (uuid, foreign key to vouchers, unique)
     - created_at (timestamptz, default now())
     - Fast lookup table for code -> voucher_id mapping

  4. **registrations**
     - id (uuid, primary key)
     - registration_code (text, unique, not null, e.g., MT-000123)
     - full_name (text, not null)
     - email (text, not null)
     - email_normalized (text, not null, lowercase+trimmed)
     - phone (text, not null)
     - institution_id (uuid, foreign key to institutions)
     - voucher_id (uuid, foreign key to vouchers)
     - voucher_code (text, not null)
     - language (text, not null, check: 'pt-BR' or 'es')
     - status (text, not null, check: 'confirmed' or 'canceled')
     - created_at (timestamptz, default now())
     - canceled_at (timestamptz, nullable)
     - canceled_by (uuid, nullable, foreign key to auth.users)
     - confirmation_email_sent_at (timestamptz, nullable)
     - confirmation_email_last_error (text, nullable)

  5. **email_index**
     - email_normalized (text, primary key, lowercase+trimmed)
     - registration_id (uuid, foreign key to registrations, unique)
     - created_at (timestamptz, default now())
     - Ensures one email = one registration (dedupe)

  6. **admins**
     - user_id (uuid, primary key, foreign key to auth.users)
     - enabled (boolean, not null, default true)
     - created_at (timestamptz, default now())

  ## Security
  - RLS enabled on all tables
  - Public access for voucher validation and registration creation (via API)
  - Admin-only access for management operations
  - Authenticated users can only access admin tables if in admins table

  ## Indexes
  - vouchers.code (unique)
  - registrations.email_normalized
  - registrations.registration_code (unique)
  - registrations.status
  - registrations.institution_id
  - registrations.voucher_id

  ## Triggers
  - Auto-update updated_at on institutions and vouchers
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- INSTITUTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS institutions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  quota_total integer NOT NULL CHECK (quota_total >= 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institutions_used_count_within_quota CHECK (used_count <= quota_total)
);

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VOUCHERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  quota_total integer NOT NULL CHECK (quota_total >= 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vouchers_used_count_within_quota CHECK (used_count <= quota_total)
);

-- Ensure codes are always uppercase
CREATE OR REPLACE FUNCTION uppercase_voucher_code()
RETURNS trigger AS $$
BEGIN
  NEW.code = UPPER(NEW.code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vouchers_uppercase_code
  BEFORE INSERT OR UPDATE ON vouchers
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_voucher_code();

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vouchers_institution ON vouchers(institution_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- =============================================================================
-- VOUCHER_CODES LOOKUP TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS voucher_codes (
  code text PRIMARY KEY,
  voucher_id uuid UNIQUE NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure codes are always uppercase in lookup table too
CREATE OR REPLACE FUNCTION uppercase_voucher_code_lookup()
RETURNS trigger AS $$
BEGIN
  NEW.code = UPPER(NEW.code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voucher_codes_uppercase
  BEFORE INSERT OR UPDATE ON voucher_codes
  FOR EACH ROW
  EXECUTE FUNCTION uppercase_voucher_code_lookup();

ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- REGISTRATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  email_normalized text NOT NULL,
  phone text NOT NULL,
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
  voucher_code text NOT NULL,
  language text NOT NULL CHECK (language IN ('pt-BR', 'es')),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  canceled_by uuid REFERENCES auth.users(id),
  confirmation_email_sent_at timestamptz,
  confirmation_email_last_error text
);

-- Ensure email_normalized is always lowercase and trimmed
CREATE OR REPLACE FUNCTION normalize_email()
RETURNS trigger AS $$
BEGIN
  NEW.email_normalized = LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registrations_normalize_email
  BEFORE INSERT OR UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION normalize_email();

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_registrations_email_normalized ON registrations(email_normalized);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_institution ON registrations(institution_id);
CREATE INDEX IF NOT EXISTS idx_registrations_voucher ON registrations(voucher_id);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at DESC);

-- =============================================================================
-- EMAIL_INDEX TABLE (for deduplication)
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_index (
  email_normalized text PRIMARY KEY,
  registration_id uuid UNIQUE NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure email_normalized is always lowercase and trimmed
CREATE OR REPLACE FUNCTION normalize_email_index()
RETURNS trigger AS $$
BEGIN
  NEW.email_normalized = LOWER(TRIM(NEW.email_normalized));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_index_normalize
  BEFORE INSERT OR UPDATE ON email_index
  FOR EACH ROW
  EXECUTE FUNCTION normalize_email_index();

ALTER TABLE email_index ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ADMINS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER institutions_updated_at
  BEFORE UPDATE ON institutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid()
    AND enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTITUTIONS: Public read for active, admin full access
CREATE POLICY "Public can view active institutions"
  ON institutions FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can insert institutions"
  ON institutions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update institutions"
  ON institutions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete institutions"
  ON institutions FOR DELETE
  TO authenticated
  USING (is_admin());

-- VOUCHERS: Public read for active vouchers, admin full access
CREATE POLICY "Public can view active vouchers"
  ON vouchers FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can insert vouchers"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update vouchers"
  ON vouchers FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete vouchers"
  ON vouchers FOR DELETE
  TO authenticated
  USING (is_admin());

-- VOUCHER_CODES: Public read (for validation), admin write
CREATE POLICY "Public can read voucher codes"
  ON voucher_codes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert voucher codes"
  ON voucher_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete voucher codes"
  ON voucher_codes FOR DELETE
  TO authenticated
  USING (is_admin());

-- REGISTRATIONS: Admins can view all, public can insert (via API)
CREATE POLICY "Admins can view all registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can insert registrations"
  ON registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update registrations"
  ON registrations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- EMAIL_INDEX: Service role can read/write (for deduplication), admins can view
CREATE POLICY "Service can manage email index"
  ON email_index FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ADMINS: Only existing admins can manage
CREATE POLICY "Admins can view admins"
  ON admins FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert admins"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update admins"
  ON admins FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete admins"
  ON admins FOR DELETE
  TO authenticated
  USING (is_admin());