'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Menu, X, Lock } from 'lucide-react';

interface NavbarProps {
  brandName?: string;
  hasPackages?: boolean;
}

export function Navbar({ brandName = 'Cinematic Chapters', hasPackages = true }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0D0C0A]/90 backdrop-blur-md py-3 border-b border-[#C8AD7F]/20'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full border border-[#C8AD7F]/40 flex items-center justify-center text-[#C8AD7F] group-hover:border-[#C8AD7F] group-hover:shadow-[0_0_12px_rgba(200,173,127,0.4)] transition-all">
            <Camera className="w-4 h-4" />
          </div>
          <span className="font-headline text-xl md:text-2xl font-bold tracking-wider text-[#F2EDE4] uppercase">
            {brandName}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#hero"
            className="font-condensed text-sm uppercase tracking-widest text-[#B7AEA2] hover:text-[#C8AD7F] transition-colors"
          >
            Home
          </a>
          <a
            href="#team"
            className="font-condensed text-sm uppercase tracking-widest text-[#B7AEA2] hover:text-[#C8AD7F] transition-colors"
          >
            Team
          </a>
          <a
            href="#gallery"
            className="font-condensed text-sm uppercase tracking-widest text-[#B7AEA2] hover:text-[#C8AD7F] transition-colors"
          >
            Gallery
          </a>
          {hasPackages && (
            <a
              href="#packages"
              className="font-condensed text-sm uppercase tracking-widest text-[#B7AEA2] hover:text-[#C8AD7F] transition-colors"
            >
              Packages
            </a>
          )}
          <a
            href="#reviews"
            className="font-condensed text-sm uppercase tracking-widest text-[#B7AEA2] hover:text-[#C8AD7F] transition-colors"
          >
            Reviews
          </a>
          <a
            href="#contact"
            className="font-condensed text-sm uppercase tracking-widest text-[#B7AEA2] hover:text-[#C8AD7F] transition-colors"
          >
            Contact
          </a>

          {/* Client Portal Link */}
          <Link
            href="/client/login"
            className="flex items-center gap-1.5 font-condensed text-xs uppercase tracking-widest text-[#806849] hover:text-[#C8AD7F] px-3 py-1.5 rounded-full border border-[#806849]/30 transition-all"
          >
            <Lock className="w-3 h-3 text-[#C8AD7F]" />
            Client Portal
          </Link>

          {/* Book Session CTA */}
          <a
            href="#booking"
            className="capsule-button-gold text-xs py-2 px-5"
          >
            Book Session
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#F2EDE4] p-2 focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-[#C8AD7F]" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D0C0A]/98 border-b border-[#C8AD7F]/20 px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
          <a
            href="#hero"
            onClick={() => setMobileMenuOpen(false)}
            className="font-condensed text-lg uppercase tracking-wider text-[#F2EDE4]"
          >
            Home
          </a>
          <a
            href="#team"
            onClick={() => setMobileMenuOpen(false)}
            className="font-condensed text-lg uppercase tracking-wider text-[#F2EDE4]"
          >
            Team
          </a>
          <a
            href="#gallery"
            onClick={() => setMobileMenuOpen(false)}
            className="font-condensed text-lg uppercase tracking-wider text-[#F2EDE4]"
          >
            Gallery
          </a>
          {hasPackages && (
            <a
              href="#packages"
              onClick={() => setMobileMenuOpen(false)}
              className="font-condensed text-lg uppercase tracking-wider text-[#F2EDE4]"
            >
              Packages
            </a>
          )}
          <a
            href="#reviews"
            onClick={() => setMobileMenuOpen(false)}
            className="font-condensed text-lg uppercase tracking-wider text-[#F2EDE4]"
          >
            Reviews
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="font-condensed text-lg uppercase tracking-wider text-[#F2EDE4]"
          >
            Contact
          </a>

          <div className="pt-4 border-t border-[#302921] flex flex-col gap-3">
            <Link
              href="/client/login"
              onClick={() => setMobileMenuOpen(false)}
              className="capsule-button-outline text-xs text-center"
            >
              Client Gallery Portal
            </Link>
            <a
              href="#booking"
              onClick={() => setMobileMenuOpen(false)}
              className="capsule-button-gold text-xs text-center"
            >
              Book a Session
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
