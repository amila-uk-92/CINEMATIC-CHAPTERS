'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Slide {
  url: string;
  alt?: string;
  caption?: string;
}

interface HeroSlideshowProps {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  slides: Slide[];
}

export function HeroSlideshow({
  headline = 'MOMENTS\nBECOME\nCHAPTERS',
  subheadline = 'Cinematic photography for the moments that matter. Based in Leicester. Creating stories across the surrounding area.',
  ctaText = 'Book a Session',
  slides,
}: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 7000); // 7-second slow elegant pacing
    return () => clearInterval(interval);
  }, [slides]);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Slides with Slow Zoom and Crossfade */}
      <div className="absolute inset-0 z-0">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <div
                className={`w-full h-full bg-cover bg-center transition-transform duration-[8000ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                style={{ backgroundImage: `url(${slide.url})` }}
                role="img"
                aria-label={slide.alt || 'Cinematic photography'}
              />
            </div>
          );
        })}
        {/* Dark Cinematic Readability Overlay */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#0D0C0A] via-[#0D0C0A]/60 to-[#0D0C0A]/40" />
        <div className="absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0D0C0A]/40 to-[#0D0C0A]" />
      </div>

      {/* Main Content */}
      <div className="relative z-30 max-w-4xl mx-auto px-6 text-center pt-24 pb-16 flex flex-col items-center">
        {/* Geographic location badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8AD7F]/30 bg-[#191713]/80 backdrop-blur-md mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8AD7F]" />
          <span className="font-condensed text-xs uppercase tracking-[0.2em] text-[#C8AD7F]">
            Leicester & Midlands • Dual Photographer Perspective
          </span>
        </div>

        {/* Tall condensed heavy headline */}
        <h1 className="font-headline text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-[#F2EDE4] uppercase leading-[0.9] drop-shadow-2xl whitespace-pre-line mb-6">
          {headline}
        </h1>

        {/* Supporting copy */}
        <p className="max-w-xl text-base md:text-lg text-[#B7AEA2] font-light leading-relaxed mb-10 text-center">
          {subheadline}
        </p>

        {/* Booking CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a href="#booking" className="capsule-button-gold text-sm tracking-wider px-8 py-3.5 shadow-gold-glow">
            {ctaText}
          </a>
          <a href="#gallery" className="capsule-button-outline text-sm tracking-wider px-8 py-3.5">
            Explore Work
          </a>
        </div>
      </div>

      {/* Subtle Scroll Cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none opacity-70 animate-bounce">
        <span className="font-condensed text-[10px] uppercase tracking-widest text-[#B7AEA2]">Scroll</span>
        <ChevronDown className="w-4 h-4 text-[#C8AD7F]" />
      </div>
    </section>
  );
}
