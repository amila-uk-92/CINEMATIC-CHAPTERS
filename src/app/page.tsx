import { query } from '@/lib/db';
import { Navbar } from '@/components/public/Navbar';
import { LensFocusIndicator } from '@/components/public/LensFocusIndicator';
import { HeroSlideshow } from '@/components/public/HeroSlideshow';
import { TeamSection } from '@/components/public/TeamSection';
import { PhotoWall } from '@/components/public/PhotoWall';
import { PackagesSection } from '@/components/public/PackagesSection';
import { BookingCalendar } from '@/components/public/BookingCalendar';
import { ReviewsAndFaq } from '@/components/public/ReviewsAndFaq';
import { ContactSection } from '@/components/public/ContactSection';
import { WebsiteChat } from '@/components/public/WebsiteChat';

export const revalidate = 0; // Always serve fresh data

export default async function HomePage() {
  // Fetch published live content
  const contentRes = await query(`SELECT data FROM website_content WHERE id = 'live'`);
  const content = contentRes.rows[0]?.data || {};

  // Fetch availability config to check if packages section is visible
  const configRes = await query(`SELECT packages_section_visible FROM availability_config WHERE id = 'default'`);
  const packagesVisible = configRes.rows[0]?.packages_section_visible ?? true;

  // Fetch active packages
  const pkgRes = await query(
    `SELECT * FROM packages WHERE is_public_visible = true AND is_archived = false ORDER BY display_order ASC`
  );
  const packages = pkgRes.rows || [];

  // Build dynamic Lens Focus Rail sections
  const sections = [
    { id: 'hero', label: 'Home' },
    { id: 'team', label: 'Team' },
    { id: 'gallery', label: 'Gallery' },
    ...(packagesVisible && packages.length > 0 ? [{ id: 'packages', label: 'Packages' }] : []),
    { id: 'booking', label: 'Booking' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <main className="relative bg-[#0D0C0A] min-h-screen text-[#F2EDE4]">
      {/* Top Navbar */}
      <Navbar brandName={content.brandName} hasPackages={packagesVisible && packages.length > 0} />

      {/* Optical Lens Focus Section Rail */}
      <LensFocusIndicator sections={sections} />

      {/* Hero Slideshow */}
      <HeroSlideshow
        headline={content.heroHeadline}
        subheadline={content.heroSubheadline}
        ctaText={content.heroCtaText}
        slides={content.heroSlides || []}
      />

      {/* Dual Photographer Team Section */}
      <TeamSection quotation={content.teamQuotation} members={content.teamMembers || []} />

      {/* Multi-Row Looping Photo Wall */}
      <PhotoWall photos={content.photoWall || []} />

      {/* Duration Packages Section (Shown only if enabled) */}
      {packagesVisible && packages.length > 0 && (
        <PackagesSection packages={packages} />
      )}

      {/* Shared Studio Booking Calendar */}
      <BookingCalendar packages={packages} />

      {/* Client Reviews, 4-Stage Process & FAQ */}
      <ReviewsAndFaq reviews={content.reviews || []} faqs={content.faqs || []} />

      {/* Studio Contact & Enquiry */}
      <ContactSection contactInfo={content.contactInfo} />

      {/* Website Chat Connected to Telegram */}
      <WebsiteChat />
    </main>
  );
}
