import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { query } from '@/lib/db';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const liveRes = await query(`SELECT data, published_at FROM website_content WHERE id = 'live'`);
  const draftRes = await query(`SELECT data, updated_at FROM website_content WHERE id = 'draft'`);

  return NextResponse.json({
    live: liveRes.rows[0]?.data || {},
    draft: draftRes.rows[0]?.data || {},
    publishedAt: liveRes.rows[0]?.published_at,
    draftUpdatedAt: draftRes.rows[0]?.updated_at,
  });
}

// Save draft or publish live
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, data } = await req.json(); // action: 'save_draft' | 'publish'

  if (action === 'save_draft') {
    await query(
      `INSERT INTO website_content (id, data, updated_by, updated_at)
       VALUES ('draft', $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(data), admin.email]
    );

    return NextResponse.json({ success: true, message: 'Draft saved' });
  }

  if (action === 'publish') {
    // Copy draft or provided data to live
    const contentToPublish = data || (await query(`SELECT data FROM website_content WHERE id = 'draft'`)).rows[0]?.data;

    await query(
      `INSERT INTO website_content (id, data, updated_by, published_at, updated_at)
       VALUES ('live', $1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, published_at = NOW(), updated_at = NOW()`,
      [JSON.stringify(contentToPublish), admin.email]
    );

    // Also update draft to match
    await query(
      `INSERT INTO website_content (id, data, updated_by, updated_at)
       VALUES ('draft', $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [JSON.stringify(contentToPublish), admin.email]
    );

    // Log administrative audit action
    await query(
      `INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'publish_website_content', 'website_content', 'live', $3)`,
      ['audit_' + Date.now(), admin.id, JSON.stringify({ publishedBy: admin.email })]
    );

    return NextResponse.json({ success: true, message: 'Content published live' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
