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
    const file = formData.get('file') as File | null;
    const sectionTag = (formData.get('sectionTag') as string) || 'general';
    const altText = (formData.get('altText') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique storage key
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const storageKey = `media/${filename}`;

    const storage = getStorage();
    const uploaded = await storage.putObject(storageKey, buffer, file.type, true);

    const assetId = 'asset_' + crypto.randomBytes(8).toString('hex');
    await query(
      `INSERT INTO media_assets (
        id, filename, original_name, mime_type, size_bytes, storage_key, url, alt_text, section_tag
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        assetId,
        filename,
        file.name,
        file.type,
        buffer.length,
        uploaded.key,
        uploaded.url,
        altText,
        sectionTag,
      ]
    );

    return NextResponse.json({
      success: true,
      asset: {
        id: assetId,
        url: uploaded.url,
        filename,
        size: buffer.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await query(`SELECT * FROM media_assets ORDER BY created_at DESC`);
  return NextResponse.json({ assets: res.rows });
}
