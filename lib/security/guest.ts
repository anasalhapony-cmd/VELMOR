import { cookies } from 'next/headers';

/**
 * Guest device identifier — a random, unguessable id kept in an httpOnly cookie.
 * Used for the account-free wishlist. It carries NO personal data. The cookie is
 * issued by middleware; this reads it server-side.
 */
export const GUEST_COOKIE = 'vg_device';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidDeviceId(id: string | null | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

/** Read the guest device id from the request cookies (may be null). */
export async function getGuestId(): Promise<string | null> {
  try {
    const store = await cookies();
    const id = store.get(GUEST_COOKIE)?.value;
    return isValidDeviceId(id) ? id : null;
  } catch {
    return null;
  }
}
