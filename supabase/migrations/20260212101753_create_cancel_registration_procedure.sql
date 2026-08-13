/*
  # Cancel Registration Procedure

  ## Overview
  Creates an idempotent stored procedure for canceling registrations
  and returning quotas to both voucher and institution.

  ## Procedure: cancel_registration

  This procedure:
  1. Validates registration exists
  2. If already canceled, returns success (idempotent)
  3. Updates registration status to canceled
  4. Decrements used_count on voucher and institution
  5. Keeps email_index intact (prevents re-registration with same email)

  ## Parameters
  - p_registration_id: UUID of registration to cancel
  - p_canceled_by: UUID of admin user performing cancellation

  ## Returns
  JSON object with:
  - success: boolean
  - error: Error code string (if failure)

  ## Error Codes
  - REGISTRATION_NOT_FOUND: Registration doesn't exist
*/

CREATE OR REPLACE FUNCTION cancel_registration(
  p_registration_id uuid,
  p_canceled_by uuid
)
RETURNS jsonb AS $$
DECLARE
  v_current_status text;
  v_voucher_id uuid;
  v_institution_id uuid;
BEGIN
  SELECT status, voucher_id, institution_id
  INTO v_current_status, v_voucher_id, v_institution_id
  FROM registrations
  WHERE id = p_registration_id
  FOR UPDATE;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'REGISTRATION_NOT_FOUND'
    );
  END IF;

  IF v_current_status = 'canceled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already canceled'
    );
  END IF;

  UPDATE registrations
  SET
    status = 'canceled',
    canceled_at = NOW(),
    canceled_by = p_canceled_by
  WHERE id = p_registration_id;

  UPDATE vouchers
  SET used_count = GREATEST(0, used_count - 1)
  WHERE id = v_voucher_id;

  UPDATE institutions
  SET used_count = GREATEST(0, used_count - 1)
  WHERE id = v_institution_id;

  RETURN jsonb_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql;
