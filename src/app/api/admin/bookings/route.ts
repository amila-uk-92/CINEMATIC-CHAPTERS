import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { queueEmail } from '@/lib/email';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Automatically expire pending bookings older than pending_expiry_hours
  await query(`
    UPDATE bookings
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW()
  `);

  const bookingsRes = await query(`SELECT * FROM bookings ORDER BY created_at DESC`);
  return NextResponse.json({ bookings: bookingsRes.rows });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookingId, action, reason, newStartTimeStr, newSessionDate } = await req.json();

  const bkRes = await query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
  if (bkRes.rows.length === 0) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  const booking = bkRes.rows[0];

  // 1. APPROVE
  if (action === 'approve') {
    // Recheck overlap before approving
    const configRes = await query(`SELECT buffer_minutes FROM availability_config WHERE id = 'default'`);
    const bufferMs = (configRes.rows[0]?.buffer_minutes || 60) * 60 * 1000;

    const conflict = await query(
      `SELECT id FROM bookings
       WHERE id != $1
         AND session_date = $2
         AND status = 'confirmed'
         AND start_time < $3
         AND end_time > $4`,
      [
        booking.id,
        booking.session_date,
        new Date(new Date(booking.end_time).getTime() + bufferMs).toISOString(),
        new Date(new Date(booking.start_time).getTime() - bufferMs).toISOString(),
      ]
    );

    if (conflict.rows.length > 0) {
      return NextResponse.json({ error: 'Cannot approve: Conflicts with an already confirmed booking' }, { status: 409 });
    }

    await query(`UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1`, [bookingId]);

    // Send confirmation email
    await queueEmail({
      to: booking.customer_email,
      subject: `Your Photography Session is Confirmed!`,
      template: 'booking_confirmed',
      variables: {
        customerName: booking.customer_name,
        sessionDate: booking.session_date,
        sessionTime: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        packageName: booking.package_snapshot?.name || 'Session',
        locationNotes: booking.location_notes,
      },
    });

    return NextResponse.json({ success: true, status: 'confirmed' });
  }

  // 2. DECLINE
  if (action === 'decline') {
    await query(`UPDATE bookings SET status = 'declined', updated_at = NOW() WHERE id = $1`, [bookingId]);

    // Send polite decline email
    await queueEmail({
      to: booking.customer_email,
      subject: `Update regarding your booking request`,
      template: 'booking_declined',
      variables: {
        customerName: booking.customer_name,
        sessionDate: booking.session_date,
        reason: reason || 'Photographers scheduling conflict',
      },
    });

    return NextResponse.json({ success: true, status: 'declined' });
  }

  // 3. CANCEL
  if (action === 'cancel') {
    await query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [bookingId]);
    return NextResponse.json({ success: true, status: 'cancelled' });
  }

  // 4. RESCHEDULE
  if (action === 'reschedule') {
    if (!newSessionDate || !newStartTimeStr) {
      return NextResponse.json({ error: 'New session date and time are required' }, { status: 400 });
    }

    const durationMinutes = booking.package_snapshot?.duration_minutes || 120;
    const newStart = new Date(`${newSessionDate}T${newStartTimeStr}:00Z`);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

    const configRes = await query(`SELECT buffer_minutes FROM availability_config WHERE id = 'default'`);
    const bufferMs = (configRes.rows[0]?.buffer_minutes || 60) * 60 * 1000;

    const conflict = await query(
      `SELECT id FROM bookings
       WHERE id != $1
         AND session_date = $2
         AND status = 'confirmed'
         AND start_time < $3
         AND end_time > $4`,
      [
        booking.id,
        newSessionDate,
        new Date(newEnd.getTime() + bufferMs).toISOString(),
        new Date(newStart.getTime() - bufferMs).toISOString(),
      ]
    );

    if (conflict.rows.length > 0) {
      return NextResponse.json({ error: 'Reschedule conflict with existing confirmed session' }, { status: 409 });
    }

    await query(
      `UPDATE bookings
       SET session_date = $1, start_time = $2, end_time = $3, status = 'confirmed', updated_at = NOW()
       WHERE id = $4`,
      [newSessionDate, newStart.toISOString(), newEnd.toISOString(), bookingId]
    );

    return NextResponse.json({ success: true, status: 'confirmed' });
  }

  return NextResponse.json({ error: 'Invalid booking action' }, { status: 400 });
}
