'use client';

import React, { useEffect, useState } from 'react';

export interface SectionIndicatorItem {
  id: string;
  label: string;
}

interface LensFocusIndicatorProps {
  sections: SectionIndicatorItem[];
}

export function LensFocusIndicator({ sections }: LensFocusIndicatorProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || 'hero');
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollY / docHeight : 0;
      setScrollProgress(progress);

      // Determine active section based on viewport position
      const viewportCenter = scrollY + window.innerHeight * 0.35;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const top = el.offsetTop;
          if (viewportCenter >= top) {
            setActiveSection(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const activeIndex = sections.findIndex((s) => s.id === activeSection);
  const currentNum = String(Math.max(1, activeIndex + 1)).padStart(2, '0');
  const totalNum = String(sections.length).padStart(2, '0');

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Mobile Lens Indicator (Top/Right floating pill) */}
      <div className="md:hidden fixed top-20 right-4 z-40 flex items-center gap-2 bg-[#191713]/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#C8AD7F]/30 shadow-glass">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C8AD7F] animate-pulse" />
        <span className="font-condensed text-xs uppercase tracking-widest text-[#F2EDE4]">
          {sections.find((s) => s.id === activeSection)?.label}
        </span>
        <span className="text-[10px] text-[#806849] font-mono">
          {currentNum}/{totalNum}
        </span>
      </div>

      {/* Desktop Optical Lens-Barrel Rail (Fixed on Right Edge) */}
      <aside
        aria-label="Lens Focus Section Rail"
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center select-none"
      >
        {/* Curvature & Lens Barrel Background */}
        <div className="relative py-8 px-4 rounded-l-2xl bg-gradient-to-l from-[#0D0C0A] via-[#191713]/95 to-transparent border-y border-l border-[#806849]/30 shadow-2xl backdrop-blur-lg">
          {/* Optical Calibration Reference Ticks */}
          <div className="absolute right-1 inset-y-6 flex flex-col justify-between py-2 pointer-events-none opacity-40">
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className={`h-[1px] bg-[#C8AD7F] transition-all duration-300 ${
                  i % 3 === 0 ? 'w-3 opacity-90' : 'w-1.5 opacity-40'
                }`}
              />
            ))}
          </div>

          {/* Stationary Champagne-Gold Aperture Pointer */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-[#C8AD7F] drop-shadow-[0_0_8px_rgba(200,173,127,0.8)]" />
          </div>

          {/* Section labels moving smoothly */}
          <div className="flex flex-col gap-6 items-end pr-3">
            {sections.map((section, idx) => {
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollTo(section.id)}
                  className="group flex items-center gap-3 text-right focus:outline-none"
                  aria-label={`Scroll to ${section.label}`}
                >
                  <span
                    className={`font-condensed text-xs uppercase tracking-widest transition-all duration-300 ${
                      isActive
                        ? 'text-[#C8AD7F] font-bold scale-105 drop-shadow-[0_0_10px_rgba(200,173,127,0.4)]'
                        : 'text-[#B7AEA2]/50 hover:text-[#F2EDE4]'
                    }`}
                  >
                    {section.label}
                  </span>
                  <div
                    className={`h-[2px] rounded-full transition-all duration-300 ${
                      isActive
                        ? 'w-5 bg-[#C8AD7F] shadow-[0_0_8px_#C8AD7F]'
                        : 'w-2 bg-[#806849]/50 group-hover:w-3 group-hover:bg-[#B7AEA2]'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Barrel Numeric Dial readout */}
          <div className="mt-6 pt-4 border-t border-[#302921] flex items-center justify-between gap-3 text-[10px] font-mono text-[#806849]">
            <span className="text-[#C8AD7F]">FOCUS</span>
            <span className="tracking-widest">
              {currentNum} / {totalNum}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
