import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createClientSession, clearClientSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    const res = await query(
      `SELECT * FROM clients WHERE access_token = $1 AND access_revoked = false`,
      [token.trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or revoked client access key' }, { status: 401 });
    }

    const client = res.rows[0];

    // Create client session
    await createClientSession(client.id);

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearClientSession();
  return NextResponse.json({ success: true });
}
