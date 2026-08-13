/**
 * Validates that a password meets security requirements:
 * - at least 8 characters
 * - at least one uppercase letter
 * - at least one lowercase letter
 * - at least one digit
 * - at least one special character
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
