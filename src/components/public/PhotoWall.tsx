'use client';

import React from 'react';

interface WallPhoto {
  url: string;
  alt: string;
  aspect?: 'portrait' | 'landscape' | 'square';
}

interface PhotoWallProps {
  photos: WallPhoto[];
}

export function PhotoWall({ photos }: PhotoWallProps) {
  // Ensure we have enough items for seamless marquee rows
  const safePhotos = photos.length > 0 ? photos : [
    { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop', alt: 'Sample 1' },
    { url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800&auto=format&fit=crop', alt: 'Sample 2' },
    { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop', alt: 'Sample 3' },
  ];

  // Divide into 3 rows for mobile / desktop
  const row1 = [...safePhotos, ...safePhotos];
  const row2 = [...safePhotos.slice().reverse(), ...safePhotos.slice().reverse()];
  const row3 = [...safePhotos.slice(2), ...safePhotos.slice(0, 2), ...safePhotos];

  return (
    <section id="gallery" className="py-24 bg-[#0D0C0A] relative overflow-hidden border-t border-[#302921]/40">
      {/* Title Header */}
      <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
            The Visual Tapestry
          </span>
          <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4] mt-2">
            Captured Stories
          </h2>
        </div>
        <p className="text-xs text-[#B7AEA2] max-w-sm font-light">
          Continuous photographic sequences captured across Leicestershire, Charnwood Forest, and private UK venues.
        </p>
      </div>

      {/* 3 Infinite Alternating Rows */}
      <div className="space-y-4 md:space-y-6">
        {/* Row 1: Leftward movement */}
        <div className="flex gap-4 md:gap-6 animate-marquee whitespace-nowrap overflow-hidden">
          {row1.map((item, i) => (
            <div
              key={`r1-${i}`}
              className="flex-shrink-0 relative overflow-hidden rounded-lg border border-[#302921] group transition-all duration-300 hover:scale-[1.03] hover:border-[#C8AD7F]/60"
              style={{
                width: item.aspect === 'landscape' ? '380px' : '260px',
                height: '240px',
              }}
            >
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.url})` }}
                role="img"
                aria-label={item.alt}
              />
              <div className="absolute inset-0 bg-[#0D0C0A]/20 group-hover:bg-transparent transition-colors" />
            </div>
          ))}
        </div>

        {/* Row 2: Rightward movement */}
        <div className="flex gap-4 md:gap-6 animate-marquee-reverse whitespace-nowrap overflow-hidden">
          {row2.map((item, i) => (
            <div
              key={`r2-${i}`}
              className="flex-shrink-0 relative overflow-hidden rounded-lg border border-[#302921] group transition-all duration-300 hover:scale-[1.03] hover:border-[#C8AD7F]/60"
              style={{
                width: item.aspect === 'landscape' ? '400px' : '270px',
                height: '240px',
              }}
            >
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.url})` }}
                role="img"
                aria-label={item.alt}
              />
              <div className="absolute inset-0 bg-[#0D0C0A]/20 group-hover:bg-transparent transition-colors" />
            </div>
          ))}
        </div>

        {/* Row 3: Leftward movement */}
        <div className="flex gap-4 md:gap-6 animate-marquee whitespace-nowrap overflow-hidden">
          {row3.map((item, i) => (
            <div
              key={`r3-${i}`}
              className="flex-shrink-0 relative overflow-hidden rounded-lg border border-[#302921] group transition-all duration-300 hover:scale-[1.03] hover:border-[#C8AD7F]/60"
              style={{
                width: item.aspect === 'landscape' ? '360px' : '250px',
                height: '240px',
              }}
            >
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.url})` }}
                role="img"
                aria-label={item.alt}
              />
              <div className="absolute inset-0 bg-[#0D0C0A]/20 group-hover:bg-transparent transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee-reverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .animate-marquee {
          animation: marquee 45s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee-reverse 45s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee,
          .animate-marquee-reverse {
            animation: none !important;
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}
