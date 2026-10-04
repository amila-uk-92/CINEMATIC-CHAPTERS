import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  const durationMinutes = parseInt(searchParams.get('duration') || '120', 10);

  if (!dateStr) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    // 1. Fetch weekly schedule & buffer settings
    const configRes = await query(`SELECT * FROM availability_config WHERE id = 'default'`);
    const config = configRes.rows[0];
    const weeklySchedule = config?.weekly_schedule || {};
    const bufferMinutes = config?.buffer_minutes || 60;
    const minNoticeHours = config?.min_notice_hours || 48;

    // Determine day of week
    const targetDate = new Date(`${dateStr}T00:00:00Z`);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[targetDate.getUTCDay()];
    const workingWindows = weeklySchedule[dayName] || [];

    if (workingWindows.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 2. Fetch existing bookings for this date that are pending or confirmed
    const bookingsRes = await query(
      `SELECT start_time, end_time, status FROM bookings
       WHERE session_date = $1 AND status IN ('pending', 'confirmed')`,
      [dateStr]
    );
    const existingBookings = bookingsRes.rows;

    // 3. Fetch blocked periods
    const blockedRes = await query(
      `SELECT start_time, end_time, is_full_day FROM blocked_periods
       WHERE DATE(start_time) <= $1 AND DATE(end_time) >= $1`,
      [dateStr]
    );
    if (blockedRes.rows.some((b) => b.is_full_day)) {
      return NextResponse.json({ slots: [] });
    }

    // 4. Generate prospective slot candidates within working hours
    const availableSlots: string[] = [];
    const now = new Date();
    const noticeThreshold = new Date(now.getTime() + minNoticeHours * 3600 * 1000);

    for (const win of workingWindows) {
      const [startHour, startMin] = win.start.split(':').map(Number);
      const [endHour, endMin] = win.end.split(':').map(Number);

      const winStart = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00Z`);
      const winEnd = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00Z`);

      // 60-minute step intervals for slot options
      let current = new Date(winStart);
      while (current.getTime() + durationMinutes * 60 * 1000 <= winEnd.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + durationMinutes * 60 * 1000);

        // Check notice threshold
        if (slotStart > noticeThreshold) {
          // Check overlap with existing bookings (including setup buffer)
          const bufferMs = bufferMinutes * 60 * 1000;
          const hasConflict = existingBookings.some((b) => {
            const bStart = new Date(b.start_time).getTime() - bufferMs;
            const bEnd = new Date(b.end_time).getTime() + bufferMs;
            return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
          });

          // Check overlap with blocked periods
          const hasBlock = blockedRes.rows.some((b) => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = new Date(b.end_time).getTime();
            return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
          });

          if (!hasConflict && !hasBlock) {
            const timeStr = `${String(slotStart.getUTCHours()).padStart(2, '0')}:${String(slotStart.getUTCMinutes()).padStart(2, '0')}`;
            availableSlots.push(timeStr);
          }
        }

        // Advance by 60 mins
        current = new Date(current.getTime() + 60 * 60 * 1000);
      }
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
