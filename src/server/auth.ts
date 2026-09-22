/** HTTP Basic auth for /admin (user "admin", password ADMIN_PASSWORD). */
import { safeEqual, sha256Hex } from './crypto';
import type { Env } from './env';

export async function adminAuthorized(env: Env, request: Request): Promise<boolean> {
  if (!env.ADMIN_PASSWORD) return false;
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  // Compare hashes so the comparison is constant-time regardless of length.
  const [a, b] = await Promise.all([sha256Hex(pass), sha256Hex(env.ADMIN_PASSWORD)]);
  return user === 'admin' && safeEqual(a, b);
}

export const unauthorized = () =>
  new Response('Authentication required', { status: 401, headers: { 'www-authenticate': 'Basic realm="admin", charset="UTF-8"', 'cache-control': 'no-store' } });
