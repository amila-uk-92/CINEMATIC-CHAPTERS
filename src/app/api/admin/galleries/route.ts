import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { queueEmail } from '@/lib/email';
import crypto from 'crypto';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch clients with albums
  const clientsRes = await query(`
    SELECT c.*,
      COALESCE(json_agg(a.*) FILTER (WHERE a.id IS NOT NULL), '[]') as albums
    FROM clients c
    LEFT JOIN albums a ON a.client_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);

  // Calculate storage metrics
  const storageRes = await query(`
    SELECT
      COALESCE(SUM(size_bytes), 0) as private_bytes,
      COUNT(*) as total_photos
    FROM album_photos
  `);

  const mediaStorageRes = await query(`
    SELECT COALESCE(SUM(size_bytes), 0) as public_bytes FROM media_assets
  `);

  const totalUsedBytes = Number(storageRes.rows[0].private_bytes) + Number(mediaStorageRes.rows[0].public_bytes);
  const capacityBytes = parseInt(process.env.STORAGE_CAPACITY_BYTES || '53687091200', 10); // 50 GB

  return NextResponse.json({
    clients: clientsRes.rows,
    storage: {
      usedBytes: totalUsedBytes,
      capacityBytes,
      privateBytes: Number(storageRes.rows[0].private_bytes),
      publicBytes: Number(mediaStorageRes.rows[0].public_bytes),
      usedPercentage: Math.round((totalUsedBytes / capacityBytes) * 100),
      isLowStorageWarning: (totalUsedBytes / capacityBytes) >= 0.8,
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // 1. Create Client & Album
  if (action === 'create_client_album') {
    const { clientName, clientEmail, albumTitle, sessionDate, description } = body;
    const clientId = 'cl_' + crypto.randomBytes(6).toString('hex');
    const accessToken = 'PORTAL-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    await query(
      `INSERT INTO clients (id, name, email, access_token) VALUES ($1, $2, $3, $4)`,
      [clientId, clientName, clientEmail, accessToken]
    );

    const albumId = 'alb_' + crypto.randomBytes(6).toString('hex');
    const expiresAt = new Date(Date.now() + 45 * 24 * 3600 * 1000); // 45 days

    await query(
      `INSERT INTO albums (id, client_id, title, session_date, description, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [albumId, clientId, albumTitle, sessionDate, description || '', expiresAt.toISOString()]
    );

    return NextResponse.json({ success: true, clientId, albumId, accessToken });
  }

  // 2. Notify Client (Send Gallery Ready Email)
  if (action === 'send_gallery_ready') {
    const { clientId, albumId } = body;
    const clientRes = await query(`SELECT * FROM clients WHERE id = $1`, [clientId]);
    const albumRes = await query(`SELECT * FROM albums WHERE id = $1`, [albumId]);

    if (clientRes.rows.length === 0 || albumRes.rows.length === 0) {
      return NextResponse.json({ error: 'Client or Album not found' }, { status: 404 });
    }

    const client = clientRes.rows[0];
    const album = albumRes.rows[0];
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    await queueEmail({
      to: client.email,
      subject: `Your Private Gallery is Ready: ${album.title}`,
      template: 'gallery_ready',
      variables: {
        clientName: client.name,
        albumTitle: album.title,
        galleryUrl: `${appUrl}/client/gallery?token=${client.access_token}`,
        accessToken: client.access_token,
        expiresAt: new Date(album.expires_at).toLocaleDateString('en-GB'),
      },
    });

    return NextResponse.json({ success: true });
  }

  // 3. Revoke Client Access
  if (action === 'revoke_access') {
    const { clientId } = body;
    await query(`UPDATE clients SET access_revoked = true WHERE id = $1`, [clientId]);
    // Immediately invalidate active sessions
    await query(`DELETE FROM sessions WHERE user_id = $1 AND role = 'client'`, [clientId]);
    return NextResponse.json({ success: true });
  }

  // 4. Delete Client & Associated Albums
  if (action === 'delete_client') {
    const { clientId } = body;
    await query(`DELETE FROM clients WHERE id = $1`, [clientId]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
