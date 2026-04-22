import * as crypto from 'crypto';

/**
 * Creates a new random device token (returned to client, set as cookie).
 * The client sends this back on future logins to skip 2FA.
 */
export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a device token before storing it in the DB.
 * We never store the raw token — same principle as password hashing.
 * If the DB leaks, attackers can't use the tokens.
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if any of the user's trusted-device entries match the supplied token
 * AND haven't expired.
 */
export function isDeviceTrusted(
  trustedDevices: Array<{ tokenHash: string; expiresAt: string }> | null,
  suppliedToken: string | undefined,
): boolean {
  if (!suppliedToken || !trustedDevices || trustedDevices.length === 0) {
    return false;
  }
  const hash = hashDeviceToken(suppliedToken);
  const now = new Date();
  return trustedDevices.some(
    (d) => d.tokenHash === hash && new Date(d.expiresAt) > now,
  );
}

/**
 * Append a new trusted device, drop any that have already expired.
 * 30-day trust window.
 */
export function addTrustedDevice(
  existing: Array<{ tokenHash: string; expiresAt: string }> | null,
  newTokenHash: string,
): Array<{ tokenHash: string; expiresAt: string }> {
  const now = new Date();
  const fresh = (existing || []).filter((d) => new Date(d.expiresAt) > now);
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  fresh.push({ tokenHash: newTokenHash, expiresAt: expiresAt.toISOString() });
  return fresh;
}
