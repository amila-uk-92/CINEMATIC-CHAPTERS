import { NextRequest, NextResponse } from 'next/server';
import { getClientSession, getAdminSession } from '@/lib/auth/session';
import { getStorage } from '@/lib/storage';
import { query } from '@/lib/db';
import * as archiverModule from 'archiver';
const archiver = (archiverModule as any).default || archiverModule;
import { PassThrough } from 'stream';

export async function POST(req: NextRequest) {
  const { albumId } = await req.json();
  const client = await getClientSession();
  const admin = await getAdminSession();

  if (!client && !admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify album access
  const albumRes = await query(`SELECT * FROM albums WHERE id = $1`, [albumId]);
  if (albumRes.rows.length === 0) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }
  const album = albumRes.rows[0];

  if (client && !admin && album.client_id !== client.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update status to processing
  await query(`UPDATE albums SET zip_status = 'processing' WHERE id = $1`, [albumId]);

  try {
    const photosRes = await query(`SELECT * FROM album_photos WHERE album_id = $1`, [albumId]);
    const photos = photosRes.rows;

    const storage = getStorage();
    const archive = archiver('zip', { zlib: { level: 6 } });
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];

    passthrough.on('data', (chunk) => chunks.push(chunk));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);
      archive.on('error', reject);
    });

    archive.pipe(passthrough);

    // Append each photo to zip
    for (const ph of photos) {
      try {
        const fileBuffer = await storage.getObject(ph.storage_key);
        archive.append(fileBuffer, { name: ph.original_name });
      } catch (err) {
        console.error(`Failed to read file for zip: ${ph.storage_key}`, err);
      }
    }

    await archive.finalize();
    const zipBuffer = await archivePromise;

    // Save generated ZIP to private storage
    const zipKey = `clients/${albumId}/album_${albumId}_full.zip`;
    await storage.putObject(zipKey, zipBuffer, 'application/zip', false);

    // Update album with ready zip
    await query(
      `UPDATE albums
       SET zip_status = 'ready',
           zip_storage_key = $1,
           zip_size_bytes = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [zipKey, zipBuffer.length, albumId]
    );

    return NextResponse.json({ success: true, zipKey, size: zipBuffer.length });
  } catch (err: any) {
    await query(`UPDATE albums SET zip_status = 'failed' WHERE id = $1`, [albumId]);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
