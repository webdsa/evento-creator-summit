/*
  # Create Registration Stored Procedure

  ## Overview
  Creates a secure, atomic stored procedure for handling registrations with
  proper concurrency control and quota management.

  ## Procedure: create_registration

  This procedure performs the entire registration flow in a single transaction:
  1. Validates voucher exists and is active
  2. Validates institution exists and is active
  3. Checks quota availability (voucher and institution)
  4. Checks email deduplication
  5. Creates registration record
  6. Creates email_index entry
  7. Increments used_count on both voucher and institution
  8. Generates sequential registration code (MT-XXXXXX)

  All operations are atomic - either all succeed or all fail (rollback).

  ## Parameters
  - p_voucher_code: Voucher code (will be uppercased)
  - p_full_name: Participant's full name
  - p_email: Participant's email
  - p_phone: Participant's phone
  - p_language: Language preference ('pt-BR' or 'es')

  ## Returns
  JSON object with:
  - success: boolean
  - registration_id: UUID of created registration (if success)
  - registration_code: String code like MT-000123 (if success)
  - error: Error code string (if failure)

  ## Error Codes
  - VOUCHER_NOT_FOUND: Voucher doesn't exist
  - VOUCHER_INACTIVE: Voucher is paused
  - VOUCHER_EXPIRED: Voucher has expired
  - VOUCHER_NO_QUOTA: Voucher has no remaining spots
  - INSTITUTION_NOT_FOUND: Institution doesn't exist
  - INSTITUTION_INACTIVE: Institution is inactive
  - INSTITUTION_NO_QUOTA: Institution has no remaining spots
  - EMAIL_ALREADY_REGISTERED: Email already used for registration
  - INVALID_LANGUAGE: Language not 'pt-BR' or 'es'
*/

-- Function to generate sequential registration code
CREATE OR REPLACE FUNCTION generate_registration_code()
RETURNS text AS $$
DECLARE
  next_number integer;
  code text;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(registration_code FROM 4) AS integer)
  ), 0) + 1
  INTO next_number
  FROM registrations;
  
  code := 'MT-' || LPAD(next_number::text, 6, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Main registration creation procedure
CREATE OR REPLACE FUNCTION create_registration(
  p_voucher_code text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_language text
)
RETURNS jsonb AS $$
DECLARE
  v_voucher_id uuid;
  v_institution_id uuid;
  v_voucher_status text;
  v_voucher_expires_at timestamptz;
  v_voucher_quota_total integer;
  v_voucher_used_count integer;
  v_institution_status text;
  v_institution_quota_total integer;
  v_institution_used_count integer;
  v_email_normalized text;
  v_existing_email uuid;
  v_registration_id uuid;
  v_registration_code text;
BEGIN
  IF p_language NOT IN ('pt-BR', 'es') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_LANGUAGE'
    );
  END IF;

  v_email_normalized := LOWER(TRIM(p_email));

  SELECT voucher_id INTO v_voucher_id
  FROM voucher_codes
  WHERE code = UPPER(p_voucher_code)
  FOR UPDATE;

  IF v_voucher_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VOUCHER_NOT_FOUND'
    );
  END IF;

  SELECT
    id,
    institution_id,
    status,
    expires_at,
    quota_total,
    used_count
  INTO
    v_voucher_id,
    v_institution_id,
    v_voucher_status,
    v_voucher_expires_at,
    v_voucher_quota_total,
    v_voucher_used_count
  FROM vouchers
  WHERE id = v_voucher_id
  FOR UPDATE;

  IF v_voucher_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VOUCHER_INACTIVE'
    );
  END IF;

  IF v_voucher_expires_at IS NOT NULL AND v_voucher_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VOUCHER_EXPIRED'
    );
  END IF;

  IF v_voucher_used_count >= v_voucher_quota_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VOUCHER_NO_QUOTA'
    );
  END IF;

  SELECT
    status,
    quota_total,
    used_count
  INTO
    v_institution_status,
    v_institution_quota_total,
    v_institution_used_count
  FROM institutions
  WHERE id = v_institution_id
  FOR UPDATE;

  IF v_institution_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSTITUTION_NOT_FOUND'
    );
  END IF;

  IF v_institution_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSTITUTION_INACTIVE'
    );
  END IF;

  IF v_institution_used_count >= v_institution_quota_total THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSTITUTION_NO_QUOTA'
    );
  END IF;

  SELECT registration_id INTO v_existing_email
  FROM email_index
  WHERE email_normalized = v_email_normalized;

  IF v_existing_email IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMAIL_ALREADY_REGISTERED'
    );
  END IF;

  v_registration_id := uuid_generate_v4();
  v_registration_code := generate_registration_code();

  INSERT INTO registrations (
    id,
    registration_code,
    full_name,
    email,
    email_normalized,
    phone,
    institution_id,
    voucher_id,
    voucher_code,
    language,
    status
  ) VALUES (
    v_registration_id,
    v_registration_code,
    p_full_name,
    p_email,
    v_email_normalized,
    p_phone,
    v_institution_id,
    v_voucher_id,
    UPPER(p_voucher_code),
    p_language,
    'confirmed'
  );

  INSERT INTO email_index (
    email_normalized,
    registration_id
  ) VALUES (
    v_email_normalized,
    v_registration_id
  );

  UPDATE vouchers
  SET used_count = used_count + 1
  WHERE id = v_voucher_id;

  UPDATE institutions
  SET used_count = used_count + 1
  WHERE id = v_institution_id;

  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'registration_code', v_registration_code
  );
END;
$$ LANGUAGE plpgsql;
