'use client';

import React, { useState } from 'react';
import { Clock, Check, Sparkles } from 'lucide-react';

export interface PackageData {
  id: string;
  name: string;
  price_in_pence: number;
  duration_minutes: number;
  description: string;
  inclusions: string[] | string;
  photo_allowance: string;
  delivery_estimate: string;
  bg_image_url?: string;
  is_accepting_bookings: boolean;
}

interface PackagesSectionProps {
  packages: PackageData[];
  onSelectPackage?: (pkg: PackageData) => void;
}

export function PackagesSection({ packages, onSelectPackage }: PackagesSectionProps) {
  const [selectedMobileIndex, setSelectedMobileIndex] = useState(0);

  if (!packages || packages.length === 0) return null;

  const currentMobilePkg = packages[selectedMobileIndex] || packages[0];

  const formatPrice = (pence: number) => {
    return `£${(pence / 100).toLocaleString('en-GB')}`;
  };

  const getInclusions = (pkg: PackageData): string[] => {
    if (Array.isArray(pkg.inclusions)) return pkg.inclusions;
    try {
      return JSON.parse(pkg.inclusions as string);
    } catch {
      return [];
    }
  };

  return (
    <section id="packages" className="py-24 md:py-36 bg-[#0D0C0A] relative border-t border-[#302921]/40">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
            Duration-Based Coverage
          </span>
          <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4] mt-2">
            Session Packages
          </h2>
          <p className="text-xs md:text-sm text-[#B7AEA2] mt-3 font-light">
            We structure our sessions purely by time, allowing you the creative freedom to explore portraits, documentary moments, or editorial stories without genre restrictions.
          </p>
        </div>

        {/* Mobile Tabs Switcher */}
        <div className="md:hidden flex rounded-full bg-[#191713] p-1 border border-[#302921] mb-8 max-w-md mx-auto">
          {packages.map((pkg, idx) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedMobileIndex(idx)}
              className={`flex-1 py-2 text-center font-condensed text-xs uppercase tracking-wider rounded-full transition-all ${
                selectedMobileIndex === idx
                  ? 'bg-[#C8AD7F] text-[#0D0C0A] font-bold shadow-md'
                  : 'text-[#B7AEA2] hover:text-[#F2EDE4]'
              }`}
            >
              {pkg.duration_minutes >= 480 ? 'Full Day' : `${pkg.duration_minutes / 60}H`}
            </button>
          ))}
        </div>

        {/* Mobile Single Card View */}
        <div className="md:hidden">
          <div className="glass-card-smoky rounded-2xl p-6 border border-[#C8AD7F]/30 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs text-[#C8AD7F] font-mono mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  {currentMobilePkg.duration_minutes} Minutes
                </span>
                <h3 className="font-headline text-2xl uppercase tracking-wide text-[#F2EDE4]">
                  {currentMobilePkg.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="font-headline text-3xl font-bold text-[#C8AD7F]">
                  {formatPrice(currentMobilePkg.price_in_pence)}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#B7AEA2] leading-relaxed mb-6">
              {currentMobilePkg.description}
            </p>

            <div className="space-y-3 mb-6 pt-4 border-t border-[#302921]">
              <div className="text-xs text-[#F2EDE4] font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C8AD7F]" />
                {currentMobilePkg.photo_allowance}
              </div>
              <div className="text-xs text-[#806849]">
                Estimated Delivery: {currentMobilePkg.delivery_estimate}
              </div>

              <div className="pt-2">
                <span className="font-condensed text-[11px] uppercase tracking-wider text-[#806849] block mb-2">
                  Session Inclusions:
                </span>
                <ul className="space-y-2">
                  {getInclusions(currentMobilePkg).map((inc, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#B7AEA2]">
                      <Check className="w-3.5 h-3.5 text-[#C8AD7F] shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {currentMobilePkg.is_accepting_bookings ? (
              <a
                href="#booking"
                onClick={() => onSelectPackage && onSelectPackage(currentMobilePkg)}
                className="w-full capsule-button-gold text-xs py-3 text-center"
              >
                Select & Check Dates
              </a>
            ) : (
              <button disabled className="w-full capsule-button-outline opacity-50 cursor-not-allowed text-xs py-3">
                Temporarily Fully Booked
              </button>
            )}
          </div>
        </div>

        {/* Desktop 3-Card Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg, idx) => {
            const isFeatured = idx === 1; // Middle package (4 Hours)
            return (
              <div
                key={pkg.id}
                className={`glass-card-smoky rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:border-[#C8AD7F]/60 hover:-translate-y-1 relative ${
                  isFeatured
                    ? 'border-[#C8AD7F]/50 shadow-[0_10px_35px_rgba(200,173,127,0.12)]'
                    : 'border-[#302921]'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C8AD7F] text-[#0D0C0A] font-condensed font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#806849]">
                      <Clock className="w-3.5 h-3.5 text-[#C8AD7F]" />
                      {pkg.duration_minutes} Mins
                    </span>
                    <span className="font-condensed text-[11px] uppercase tracking-wider text-[#C8AD7F]">
                      Leicester & Midlands
                    </span>
                  </div>

                  <h3 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4] mb-3">
                    {pkg.name}
                  </h3>

                  <div className="mb-6">
                    <span className="font-headline text-4xl font-bold text-[#C8AD7F]">
                      {formatPrice(pkg.price_in_pence)}
                    </span>
                    <span className="text-xs text-[#806849] ml-1.5 font-light">inclusive</span>
                  </div>

                  <p className="text-xs text-[#B7AEA2] leading-relaxed mb-6 font-light">
                    {pkg.description}
                  </p>

                  <div className="p-3.5 rounded-lg bg-[#14120E] border border-[#302921] mb-6 space-y-1.5">
                    <div className="text-xs text-[#F2EDE4] font-medium flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#C8AD7F]" />
                      {pkg.photo_allowance}
                    </div>
                    <div className="text-[11px] text-[#806849]">
                      Delivery: {pkg.delivery_estimate}
                    </div>
                  </div>

                  <div className="mb-8">
                    <span className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-3 font-semibold">
                      What is included:
                    </span>
                    <ul className="space-y-2.5">
                      {getInclusions(pkg).map((inc, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-[#B7AEA2]">
                          <Check className="w-3.5 h-3.5 text-[#C8AD7F] shrink-0 mt-0.5" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  {pkg.is_accepting_bookings ? (
                    <a
                      href="#booking"
                      onClick={() => onSelectPackage && onSelectPackage(pkg)}
                      className={`w-full text-center ${
                        isFeatured ? 'capsule-button-gold' : 'capsule-button-outline'
                      } text-xs py-3 block`}
                    >
                      Request This Session
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full capsule-button-outline opacity-40 cursor-not-allowed text-xs py-3"
                    >
                      Fully Booked
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
