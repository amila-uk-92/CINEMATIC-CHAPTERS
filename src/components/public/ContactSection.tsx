'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Camera, Clock, Send, CheckCircle2 } from 'lucide-react';

interface ContactInfo {
  location?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  hours?: string;
}

interface ContactSectionProps {
  contactInfo?: ContactInfo;
}

export function ContactSection({ contactInfo }: ContactSectionProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <footer id="contact" className="py-24 bg-[#0D0C0A] relative border-t border-[#302921]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          {/* Studio Info */}
          <div className="lg:col-span-5">
            <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
              Reach Out
            </span>
            <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4] mt-2 mb-6">
              Let&apos;s Create Together
            </h2>
            <p className="text-xs text-[#B7AEA2] leading-relaxed mb-8 max-w-md font-light">
              Whether you have a specific date in mind or simply want to explore possibilities across Leicester and the East Midlands, we would love to hear from you.
            </p>

            <div className="space-y-4 text-xs text-[#B7AEA2]">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#C8AD7F] shrink-0" />
                <span>{contactInfo?.location || 'Leicester, UK (Midlands & Nationwide Coverage)'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#C8AD7F] shrink-0" />
                <span>{contactInfo?.email || 'hello@cinematicchapters.co.uk'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#C8AD7F] shrink-0" />
                <span>{contactInfo?.phone || '+44 (0) 116 496 0284'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Camera className="w-4 h-4 text-[#C8AD7F] shrink-0" />
                <span>{contactInfo?.instagram || '@cinematicchapters'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#C8AD7F] shrink-0" />
                <span>{contactInfo?.hours || 'Mon – Sat: 09:00 – 18:00'}</span>
              </div>
            </div>
          </div>

          {/* General Message Form */}
          <div className="lg:col-span-7">
            <div className="glass-card-smoky rounded-2xl p-8 border border-[#302921]">
              <h3 className="font-headline text-2xl uppercase tracking-wide text-[#F2EDE4] mb-2">
                Send a Note
              </h3>
              <p className="text-xs text-[#B7AEA2] mb-6 font-light">
                Have questions before requesting a date? Send us a direct enquiry.
              </p>

              {submitted ? (
                <div className="p-6 rounded-xl bg-[#191713] border border-[#C8AD7F]/40 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#C8AD7F] mx-auto mb-3" />
                  <h4 className="font-headline text-xl text-[#F2EDE4] uppercase mb-1">
                    Thank You
                  </h4>
                  <p className="text-xs text-[#B7AEA2]">
                    Your message has been received. One of our photographers will reply within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Eleanor Rigby"
                        className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2.5 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                      />
                    </div>
                    <div>
                      <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2.5 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-1">
                      Message or Project Idea
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about the session you have in mind, location ideas, or preferred timeline..."
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2.5 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                    />
                  </div>

                  <button type="submit" className="capsule-button-gold text-xs py-3 px-6 w-full sm:w-auto">
                    <Send className="w-3.5 h-3.5" />
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Credits & Legal Links */}
        <div className="pt-8 border-t border-[#302921] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#806849]">
          <p>© {new Date().getFullYear()} Cinematic Chapters Photography. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-[#C8AD7F] transition-colors">Privacy Notice</a>
            <a href="/terms" className="hover:text-[#C8AD7F] transition-colors">Terms of Service</a>
            <a href="/admin/login" className="hover:text-[#C8AD7F] transition-colors">Photographer Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
