import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { queueEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      packageId,
      sessionDate,
      startTimeStr,
      customerName,
      customerEmail,
      customerPhone,
      locationNotes,
      customerMessage,
    } = body;

    if (!packageId || !sessionDate || !startTimeStr || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Missing required booking parameters' }, { status: 400 });
    }

    // 1. Fetch package snapshot
    const pkgRes = await query(`SELECT * FROM packages WHERE id = $1`, [packageId]);
    if (pkgRes.rows.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }
    const pkg = pkgRes.rows[0];

    // Calculate timestamps (ISO string in UTC)
    const startTime = new Date(`${sessionDate}T${startTimeStr}:00Z`);
    const endTime = new Date(startTime.getTime() + pkg.duration_minutes * 60 * 1000);

    // Fetch config for buffer & expiry
    const configRes = await query(`SELECT * FROM availability_config WHERE id = 'default'`);
    const config = configRes.rows[0];
    const bufferMinutes = config?.buffer_minutes || 60;
    const pendingExpiryHours = config?.pending_expiry_hours || 24;
    const bufferMs = bufferMinutes * 60 * 1000;
    const expiresAt = new Date(Date.now() + pendingExpiryHours * 3600 * 1000);

    // 2. Perform concurrency-safe transactional check and insert
    const bookingId = 'bk_' + crypto.randomBytes(8).toString('hex');
    const snapshot = {
      packageId: pkg.id,
      name: pkg.name,
      price_in_pence: pkg.price_in_pence,
      duration_minutes: pkg.duration_minutes,
      photo_allowance: pkg.photo_allowance,
      inclusions: pkg.inclusions,
    };

    const createdBooking = await withTransaction(async (tx) => {
      // Re-verify no overlapping reservations exist
      const conflictCheck = await tx(
        `SELECT id FROM bookings
         WHERE session_date = $1
           AND status IN ('pending', 'confirmed')
           AND start_time < $2
           AND end_time > $3`,
        [sessionDate, new Date(endTime.getTime() + bufferMs).toISOString(), new Date(startTime.getTime() - bufferMs).toISOString()]
      );

      if (conflictCheck.rows.length > 0) {
        throw new Error('This time slot was just reserved by another client. Please select another slot.');
      }

      const insertRes = await tx(
        `INSERT INTO bookings (
          id, package_id, package_snapshot, customer_name, customer_email, customer_phone,
          session_date, start_time, end_time, location_notes, customer_message, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12)
        RETURNING *`,
        [
          bookingId,
          pkg.id,
          JSON.stringify(snapshot),
          customerName,
          customerEmail,
          customerPhone || '',
          sessionDate,
          startTime.toISOString(),
          endTime.toISOString(),
          locationNotes || '',
          customerMessage || '',
          expiresAt.toISOString(),
        ]
      );

      return insertRes.rows[0];
    });

    // 3. Queue durable transactional confirmation email
    await queueEmail({
      to: customerEmail,
      subject: `Booking Request Received: ${pkg.name}`,
      template: 'booking_received',
      variables: {
        customerName,
        sessionDate,
        sessionTime: startTimeStr,
        packageName: pkg.name,
        durationMinutes: pkg.duration_minutes,
      },
    });

    return NextResponse.json({ success: true, booking: createdBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Booking submission failed' }, { status: 409 });
  }
}
