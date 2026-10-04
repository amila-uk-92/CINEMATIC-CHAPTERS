import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await query(`SELECT * FROM packages ORDER BY display_order ASC`);
  const configRes = await query(`SELECT packages_section_visible FROM availability_config WHERE id = 'default'`);

  return NextResponse.json({
    packages: res.rows,
    packagesSectionVisible: configRes.rows[0]?.packages_section_visible ?? true,
  });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // Toggle entire section visibility
  if (action === 'toggle_section_visibility') {
    const { visible } = body;
    await query(
      `UPDATE availability_config SET packages_section_visible = $1, updated_at = NOW() WHERE id = 'default'`,
      [visible]
    );
    return NextResponse.json({ success: true, packagesSectionVisible: visible });
  }

  // Add new package
  if (action === 'create_package') {
    const { name, priceInPence, durationMinutes, description, inclusions, photoAllowance, deliveryEstimate } = body;
    const pkgId = 'pkg_' + crypto.randomBytes(6).toString('hex');

    await query(
      `INSERT INTO packages (
        id, name, price_in_pence, duration_minutes, description, inclusions, photo_allowance, delivery_estimate, display_order, is_public_visible, is_accepting_bookings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 99, true, true)`,
      [
        pkgId,
        name,
        priceInPence,
        durationMinutes,
        description,
        JSON.stringify(inclusions || []),
        photoAllowance,
        deliveryEstimate,
      ]
    );

    return NextResponse.json({ success: true, id: pkgId });
  }

  // Update package
  if (action === 'update_package') {
    const { id, name, priceInPence, durationMinutes, description, inclusions, photoAllowance, deliveryEstimate, isPublicVisible, isAcceptingBookings } = body;

    await query(
      `UPDATE packages SET
        name = $1, price_in_pence = $2, duration_minutes = $3, description = $4,
        inclusions = $5, photo_allowance = $6, delivery_estimate = $7,
        is_public_visible = $8, is_accepting_bookings = $9, updated_at = NOW()
       WHERE id = $10`,
      [
        name,
        priceInPence,
        durationMinutes,
        description,
        JSON.stringify(inclusions || []),
        photoAllowance,
        deliveryEstimate,
        isPublicVisible,
        isAcceptingBookings,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  }

  // Archive package (never cascades to delete historical bookings!)
  if (action === 'archive_package') {
    const { id } = body;
    await query(`UPDATE packages SET is_archived = true, is_public_visible = false WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
