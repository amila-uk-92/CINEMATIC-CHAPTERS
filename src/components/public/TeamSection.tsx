'use client';

import React from 'react';

interface TeamMember {
  name: string;
  role: string;
  portraitUrl: string;
}

interface TeamSectionProps {
  quotation?: string;
  members: TeamMember[];
}

export function TeamSection({
  quotation = 'Different perspectives.\nThe same love for real moments.',
  members,
}: TeamSectionProps) {
  const memberLeft = members[0] || {
    name: 'Alex Vance',
    role: 'Lead Lighting & Composition',
    portraitUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
  };

  const memberRight = members[1] || {
    name: 'Elena Croft',
    role: 'Documentary Storyteller',
    portraitUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
  };

  return (
    <section id="team" className="py-24 md:py-36 bg-[#0D0C0A] relative overflow-hidden border-t border-[#302921]/50">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Section title badge */}
        <div className="text-center mb-16">
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
            The Creative Duo
          </span>
          <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4] mt-2">
            Two Photographers. One Vision.
          </h2>
        </div>

        {/* Desktop Layout: Left Portrait, Center Quotation, Right Portrait */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 items-center">
          {/* Left Photographer Portrait */}
          <div className="md:col-span-4 flex flex-col items-center text-center">
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full p-1 bg-gradient-to-tr from-[#302921] via-[#806849] to-[#C8AD7F] shadow-2xl mb-5 group">
              <div
                className="w-full h-full rounded-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105 filter grayscale contrast-125"
                style={{ backgroundImage: `url(${memberLeft.portraitUrl})` }}
                role="img"
                aria-label={`Portrait of ${memberLeft.name}`}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#C8AD7F]/10 to-transparent pointer-events-none" />
            </div>
            <h3 className="font-headline text-2xl uppercase tracking-wider text-[#F2EDE4]">
              {memberLeft.name}
            </h3>
            <p className="font-condensed text-sm uppercase tracking-widest text-[#C8AD7F] mt-1">
              {memberLeft.role}
            </p>
          </div>

          {/* Center Quotation */}
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center px-4 py-6 md:py-0 border-y md:border-y-0 md:border-x border-[#302921]">
            <div className="w-8 h-1 bg-[#C8AD7F] mb-6" />
            <blockquote className="font-condensed text-2xl md:text-3xl text-[#F2EDE4] uppercase tracking-wide font-light leading-snug whitespace-pre-line">
              &ldquo;{quotation}&rdquo;
            </blockquote>
            <p className="text-xs text-[#B7AEA2] mt-6 max-w-xs font-light leading-relaxed">
              We never divide our shoots into primary and assistant roles. Both of us shoot side-by-side to deliver a dimensional, multi-layered visual narrative.
            </p>
            <div className="w-8 h-1 bg-[#C8AD7F] mt-6" />
          </div>

          {/* Right Photographer Portrait */}
          <div className="md:col-span-4 flex flex-col items-center text-center">
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full p-1 bg-gradient-to-tl from-[#302921] via-[#806849] to-[#C8AD7F] shadow-2xl mb-5 group">
              <div
                className="w-full h-full rounded-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105 filter grayscale contrast-125"
                style={{ backgroundImage: `url(${memberRight.portraitUrl})` }}
                role="img"
                aria-label={`Portrait of ${memberRight.name}`}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#C8AD7F]/10 to-transparent pointer-events-none" />
            </div>
            <h3 className="font-headline text-2xl uppercase tracking-wider text-[#F2EDE4]">
              {memberRight.name}
            </h3>
            <p className="font-condensed text-sm uppercase tracking-widest text-[#C8AD7F] mt-1">
              {memberRight.role}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
