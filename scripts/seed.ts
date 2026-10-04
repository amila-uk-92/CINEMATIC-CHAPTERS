import { query } from '../src/lib/db';
import { runMigrations } from '../src/lib/db/migrate';
import { hashPassword } from '../src/lib/auth/password';

async function seed() {
  console.log('Seeding initial data...');
  await runMigrations();

  // 1. Initial Admin
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@cinematicchapters.co.uk';
  const adminPass = process.env.INITIAL_ADMIN_PASSWORD || 'LeicesterStudio2026!';
  const adminPassHash = hashPassword(adminPass);

  await query(
    `INSERT INTO admin_users (id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    ['admin_1', adminEmail, adminPassHash, 'Studio Management']
  );
  console.log(`✓ Admin user provisioned: ${adminEmail}`);

  // 2. Initial Packages (2 Hours, 4 Hours, Full Day)
  const packages = [
    {
      id: 'pkg_2hr',
      name: '2 Hours Session',
      price_in_pence: 35000, // £350
      duration_minutes: 120,
      description: 'Ideal for intimate portraits, brand sessions, or Leicester city strolls.',
      inclusions: JSON.stringify([
        'Up to 2 hours active shoot time',
        'Single location in Leicester / surrounding area',
        'Online private preview gallery',
        'High-resolution edited digital downloads',
      ]),
      photo_allowance: '25 edited high-resolution images',
      delivery_estimate: '7 to 10 working days',
      display_order: 1,
      is_public_visible: true,
      is_accepting_bookings: true,
    },
    {
      id: 'pkg_4hr',
      name: '4 Hours Half-Day',
      price_in_pence: 60000, // £600
      duration_minutes: 240,
      description: 'Our most popular session. Perfect for extended editorial, couples, or multi-location stories.',
      inclusions: JSON.stringify([
        'Up to 4 hours active coverage',
        'Up to 2 locations with travel included',
        'Both photographers shooting alternate angles',
        'Full high-resolution private client gallery',
        'Pre-session creative & moodboard consultation',
      ]),
      photo_allowance: '60 edited high-resolution images',
      delivery_estimate: '10 to 14 working days',
      display_order: 2,
      is_public_visible: true,
      is_accepting_bookings: true,
    },
    {
      id: 'pkg_fullday',
      name: 'Full Day Experience',
      price_in_pence: 120000, // £1,200
      duration_minutes: 480, // Documented demo duration: 8 hours (480 mins)
      description: 'Complete unhurried documentary coverage from morning light through evening golden hour.',
      inclusions: JSON.stringify([
        'Up to 8 hours comprehensive documentary coverage',
        'Multiple locations across Leicestershire & Midlands',
        'Two dedicated photographers throughout',
        'Complete digital download package in high resolution',
        'Priority gallery grading and delivery',
      ]),
      photo_allowance: '150+ fully graded images',
      delivery_estimate: '14 working days',
      display_order: 3,
      is_public_visible: true,
      is_accepting_bookings: true,
    },
  ];

  for (const pkg of packages) {
    await query(
      `INSERT INTO packages (id, name, price_in_pence, duration_minutes, description, inclusions, photo_allowance, delivery_estimate, display_order, is_public_visible, is_accepting_bookings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        pkg.id,
        pkg.name,
        pkg.price_in_pence,
        pkg.duration_minutes,
        pkg.description,
        pkg.inclusions,
        pkg.photo_allowance,
        pkg.delivery_estimate,
        pkg.display_order,
        pkg.is_public_visible,
        pkg.is_accepting_bookings,
      ]
    );
  }
  console.log('✓ Duration-based packages seeded.');

  // 3. Availability Config
  const weeklySchedule = {
    monday: [{ start: '09:00', end: '18:00' }],
    tuesday: [{ start: '09:00', end: '18:00' }],
    wednesday: [{ start: '09:00', end: '18:00' }],
    thursday: [{ start: '09:00', end: '18:00' }],
    friday: [{ start: '09:00', end: '19:00' }],
    saturday: [{ start: '08:30', end: '19:30' }],
    sunday: [{ start: '10:00', end: '17:00' }],
  };

  await query(
    `INSERT INTO availability_config (id, weekly_schedule, min_notice_hours, booking_horizon_days, buffer_minutes, pending_expiry_hours, packages_section_visible)
     VALUES ('default', $1, 48, 90, 60, 24, true)
     ON CONFLICT (id) DO UPDATE SET weekly_schedule = EXCLUDED.weekly_schedule`,
    [JSON.stringify(weeklySchedule)]
  );
  console.log('✓ Shared calendar availability configured.');

  // 4. Initial Website Content (Draft & Published Live)
  const initialContent = {
    brandName: 'Cinematic Chapters',
    tagline: 'Leicester & Midlands Fine Art & Documentary Photography',
    heroHeadline: 'MOMENTS\nBECOME\nCHAPTERS',
    heroSubheadline: 'Cinematic photography for the moments that matter. Based in Leicester. Creating stories across the surrounding area.',
    heroCtaText: 'Book a Session',
    heroSlides: [
      {
        url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1600&auto=format&fit=crop',
        alt: 'Cinematic atmospheric landscape with golden twilight',
        caption: 'Golden hour in Bradgate Park',
      },
      {
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1600&auto=format&fit=crop',
        alt: 'Two people captured in natural documentary motion',
        caption: 'Quiet unhurried moments',
      },
      {
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1600&auto=format&fit=crop',
        alt: 'Dramatic light and shadow portraits',
        caption: 'Rich contrast & authentic light',
      },
    ],
    teamQuotation: 'Different perspectives.\nThe same love for real moments.',
    teamMembers: [
      {
        name: 'Alex Vance',
        role: 'Director of Photography / Lead Lighting',
        portraitUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
      },
      {
        name: 'Elena Croft',
        role: 'Creative Director / Documentary Specialist',
        portraitUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
      },
    ],
    photoWall: [
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop', alt: 'Wedding couple natural moment', aspect: 'portrait' },
      { url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800&auto=format&fit=crop', alt: 'Dramatic editorial landscape', aspect: 'landscape' },
      { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop', alt: 'Editorial fashion portrait', aspect: 'portrait' },
      { url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=600&auto=format&fit=crop', alt: 'Artistic silhouette at dusk', aspect: 'portrait' },
      { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop', alt: 'Midlands countryside road', aspect: 'landscape' },
      { url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=600&auto=format&fit=crop', alt: 'Intimate close-up portrait', aspect: 'portrait' },
      { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop', alt: 'Mountain mist and quiet hills', aspect: 'landscape' },
      { url: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=600&auto=format&fit=crop', alt: 'Studio portrait with rim lighting', aspect: 'portrait' },
      { url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=800&auto=format&fit=crop', alt: 'Leicester city architecture evening', aspect: 'landscape' },
    ],
    processSteps: [
      { step: '01', title: 'Request', desc: 'Choose your desired duration package and request your preferred date and slot on our live calendar.' },
      { step: '02', title: 'Confirmation', desc: 'Both photographers review the timeline and locations. Once approved, you receive official confirmation.' },
      { step: '03', title: 'Session', desc: 'An unhurried experience crafted around natural light, real atmosphere, and dual-perspective storytelling.' },
      { step: '04', title: 'Gallery Delivery', desc: 'Within the promised timeframe, receive your private web portal with complete full-resolution archive download.' },
    ],
    reviews: [
      {
        author: 'Sophie & Marcus H.',
        session: '4 Hours Half-Day Session',
        text: 'The photographs look like frames pulled straight from a feature film. Having two photographers capture quiet glances from different angles made all the difference.',
        badge: 'Sample Review',
      },
      {
        author: 'Dr. Tariq M.',
        session: '2 Hours Editorial Portrait',
        text: 'Effortless and professional. The subtle champagne and warm charcoal tones of the finished grading are exceptional.',
        badge: 'Sample Review',
      },
      {
        author: 'Hannah & James P.',
        session: 'Full Day Experience',
        text: 'From the morning prep in Leicester to golden hour in Charnwood, Alex and Elena were discreet yet captured every breathtaking detail.',
        badge: 'Sample Review',
      },
    ],
    faqs: [
      { q: 'Why do both of you shoot together?', a: 'Dual perspectives give you complete documentary coverage—one of us captures intimate micro-expressions while the other frames the grand environmental context.' },
      { q: 'How does the booking approval work?', a: 'When you submit a slot, that time is held pending our review. We verify travel logistics and lighting conditions before issuing your confirmation.' },
      { q: 'What happens if the weather is inclement?', a: 'Dramatic Midlands weather often makes for the most cinematic frames! For outdoor sessions requiring clear skies, we offer flexible rescheduling without penalty.' },
      { q: 'How do I download our photos?', a: 'You will receive a private client login key. From your secure gallery, you can view watermarked previews and download the complete full-resolution ZIP archive with one click.' },
    ],
    contactInfo: {
      location: 'Leicester, England (Covering East Midlands & UK Wide)',
      email: 'hello@cinematicchapters.co.uk',
      phone: '+44 (0) 116 496 0284',
      instagram: '@cinematicchapters',
      hours: 'Mon – Sat: 09:00 – 18:00',
    },
  };

  await query(
    `INSERT INTO website_content (id, data, published_at)
     VALUES ('live', $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, published_at = NOW()`,
    [JSON.stringify(initialContent)]
  );

  await query(
    `INSERT INTO website_content (id, data, published_at)
     VALUES ('draft', $1, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(initialContent)]
  );
  console.log('✓ Initial website content (draft and live) seeded.');

  // 5. Seed a demo client and private gallery
  const demoClientId = 'client_demo_1';
  await query(
    `INSERT INTO clients (id, name, email, access_token)
     VALUES ($1, 'Claire & Julian Vance', 'claire.vance@example.com', 'PORTAL-DEMO-2026')
     ON CONFLICT (id) DO NOTHING`,
    [demoClientId]
  );

  const demoAlbumId = 'album_demo_1';
  await query(
    `INSERT INTO albums (id, client_id, title, session_date, description, expires_at, zip_status, photo_count, total_bytes)
     VALUES ($1, $2, 'Autumn Twilight at Bradgate Park', '2026-09-18', 'Private gallery collection with full editorial color grade.', NOW() + INTERVAL '45 days', 'ready', 8, 45200000)
     ON CONFLICT (id) DO NOTHING`,
    [demoAlbumId, demoClientId]
  );

  console.log('✓ Demo client portal and gallery seeded.');
  console.log('Seed completed successfully!');
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
