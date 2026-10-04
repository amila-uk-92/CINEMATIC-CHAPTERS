import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, getClientSession } from '@/lib/auth/session';
import { getStorage } from '@/lib/storage';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const storageKey = resolvedParams.path.join('/');

  // Authorization check: User must be an authenticated Admin OR an authenticated Client whose album owns this file
  const admin = await getAdminSession();
  const client = await getClientSession();

  if (!admin && !client) {
    return NextResponse.json({ error: 'Unauthorized private access' }, { status: 401 });
  }

  if (client && !admin) {
    // If client, ensure the requested storage key belongs to their album
    const verifyOwnership = await query(
      `SELECT ap.id FROM album_photos ap
       JOIN albums a ON a.id = ap.album_id
       WHERE a.client_id = $1 AND (ap.storage_key = $2 OR ap.preview_storage_key = $2)`,
      [client.id, storageKey]
    );

    const verifyZip = await query(
      `SELECT id FROM albums WHERE client_id = $1 AND zip_storage_key = $2`,
      [client.id, storageKey]
    );

    if (verifyOwnership.rows.length === 0 && verifyZip.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const storage = getStorage();
    const data = await storage.getObject(storageKey);

    let contentType = 'image/jpeg';
    if (storageKey.endsWith('.png')) contentType = 'image/png';
    if (storageKey.endsWith('.zip')) contentType = 'application/zip';

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Private file not found' }, { status: 404 });
  }
}
