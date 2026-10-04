import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { getStorage } from '@/lib/storage';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const albumId = formData.get('albumId') as string;
    const file = formData.get('file') as File | null;

    if (!albumId || !file) {
      return NextResponse.json({ error: 'Album ID and file are required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Private storage keys
    const ext = file.name.split('.').pop() || 'jpg';
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const originalStorageKey = `clients/${albumId}/orig_${uniqueId}.${ext}`;
    const previewStorageKey = `clients/${albumId}/prev_${uniqueId}.jpg`;

    const storage = getStorage();

    // Store high-resolution original securely
    await storage.putObject(originalStorageKey, buffer, file.type, false);

    // Generate web-sized preview using Sharp
    let previewBuffer: Buffer = buffer;
    try {
      const sharp = (await import('sharp')).default;
      previewBuffer = await sharp(buffer)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      // In case image format cannot be parsed by sharp, fallback to raw buffer
    }

    await storage.putObject(previewStorageKey, previewBuffer, 'image/jpeg', false);

    const photoId = 'ph_' + crypto.randomBytes(8).toString('hex');

    await query(
      `INSERT INTO album_photos (
        id, album_id, filename, original_name, storage_key, preview_storage_key, size_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        photoId,
        albumId,
        `orig_${uniqueId}.${ext}`,
        file.name,
        originalStorageKey,
        previewStorageKey,
        buffer.length,
      ]
    );

    // Update album photo count and total bytes
    await query(
      `UPDATE albums
       SET photo_count = photo_count + 1,
           total_bytes = total_bytes + $1,
           zip_status = 'idle',
           updated_at = NOW()
       WHERE id = $2`,
      [buffer.length, albumId]
    );

    return NextResponse.json({ success: true, photoId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
