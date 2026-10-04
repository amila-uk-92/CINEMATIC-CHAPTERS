import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { generateToken } from './password';

const ADMIN_COOKIE_NAME = 'cc_admin_session';
const CLIENT_COOKIE_NAME = 'cc_client_session';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ClientUser {
  id: string;
  name: string;
  email: string;
  access_revoked: boolean;
}

export async function createAdminSession(adminId: string): Promise<string> {
  const token = generateToken(32);
  const sessionId = 'sess_' + generateToken(12);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  await query(
    `INSERT INTO sessions (id, user_id, role, token, expires_at) VALUES ($1, $2, 'admin', $3, $4)`,
    [sessionId, adminId, token, expiresAt.toISOString()]
  );

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const res = await query(
    `SELECT u.id, u.email, u.name, u.role
     FROM sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.role = 'admin' AND s.expires_at > NOW()`,
    [token]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (token) {
    await query(`DELETE FROM sessions WHERE token = $1`, [token]);
  }
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function createClientSession(clientId: string): Promise<string> {
  const token = generateToken(32);
  const sessionId = 'csess_' + generateToken(12);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await query(
    `INSERT INTO sessions (id, user_id, role, token, expires_at) VALUES ($1, $2, 'client', $3, $4)`,
    [sessionId, clientId, token, expiresAt.toISOString()]
  );

  const cookieStore = await cookies();
  cookieStore.set(CLIENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

export async function getClientSession(): Promise<ClientUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  if (!token) return null;

  const res = await query(
    `SELECT c.id, c.name, c.email, c.access_revoked
     FROM sessions s
     JOIN clients c ON c.id = s.user_id
     WHERE s.token = $1 AND s.role = 'client' AND s.expires_at > NOW() AND c.access_revoked = false`,
    [token]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function clearClientSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  if (token) {
    await query(`DELETE FROM sessions WHERE token = $1`, [token]);
  }
  cookieStore.delete(CLIENT_COOKIE_NAME);
}
