import type { Metadata } from 'next';
import { Oswald, Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';

// Licensed open-source Google fonts matching the visual reference:
// - Oswald: Tall, heavy, narrow condensed sans-serif for main cinematic headlines (SIL Open Font License)
// - Barlow Condensed: Elegant lighter condensed sans-serif for section headings, navigation, and badges
// - Inter: Highly readable modern sans-serif for body copy, calendar, forms, and admin interface
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-headline',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-condensed',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cinematic Chapters | Fine Art & Documentary Photography Leicester',
  description: 'Cinematic photography for the moments that matter. Two photographers operating together across Leicester and the surrounding UK area.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${barlowCondensed.variable} ${inter.variable} scroll-smooth`}>
      <body className="bg-background text-warm-ivory min-h-screen selection:bg-champagne-gold selection:text-background antialiased">
        {children}
      </body>
    </html>
  );
}
