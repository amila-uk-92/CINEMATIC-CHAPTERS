import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createAdminSession, clearAdminSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const res = await query(`SELECT * FROM admin_users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const admin = res.rows[0];
    const isValid = verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    // Set secure HTTP-only session cookie
    await createAdminSession(admin.id);

    return NextResponse.json({ success: true, user: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
