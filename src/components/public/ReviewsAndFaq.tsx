'use client';

import React, { useState } from 'react';
import { ChevronDown, Star, MessageSquare } from 'lucide-react';

interface Review {
  author: string;
  session: string;
  text: string;
  badge?: string;
}

interface Faq {
  q: string;
  a: string;
}

interface ReviewsAndFaqProps {
  reviews: Review[];
  faqs: Faq[];
}

export function ReviewsAndFaq({ reviews, faqs }: ReviewsAndFaqProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="reviews" className="py-24 bg-[#0D0C0A] relative border-t border-[#302921]/40">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Reviews Block */}
        <div className="mb-24">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
              Client Experiences
            </span>
            <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4] mt-2">
              Words From Our Clients
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((rev, i) => (
              <div
                key={i}
                className="glass-card-smoky rounded-xl p-6 border border-[#302921] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex text-[#C8AD7F] gap-1">
                      {Array.from({ length: 5 }).map((_, starIdx) => (
                        <Star key={starIdx} className="w-3.5 h-3.5 fill-[#C8AD7F]" />
                      ))}
                    </div>
                    {rev.badge && (
                      <span className="text-[10px] font-mono text-[#806849] bg-[#191713] px-2 py-0.5 rounded border border-[#302921]">
                        {rev.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#B7AEA2] italic leading-relaxed mb-6 font-light">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-[#302921]">
                  <h4 className="font-headline text-lg uppercase tracking-wide text-[#F2EDE4]">
                    {rev.author}
                  </h4>
                  <span className="text-[11px] text-[#C8AD7F] font-condensed uppercase tracking-wider">
                    {rev.session}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4-Step Process Section */}
        <div className="mb-24 py-12 px-6 md:px-12 rounded-2xl bg-[#14120E] border border-[#302921]">
          <div className="text-center mb-12">
            <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
              How It Unfolds
            </span>
            <h3 className="font-headline text-2xl md:text-4xl uppercase tracking-wide text-[#F2EDE4] mt-1">
              The Four-Stage Process
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: '01', title: 'Request', desc: 'Select your preferred duration package and date on our calendar.' },
              { num: '02', title: 'Confirmation', desc: 'Both photographers check logistics, lighting, and accept your date.' },
              { num: '03', title: 'The Session', desc: 'Unhurried photographic storytelling capturing natural motion.' },
              { num: '04', title: 'Private Gallery', desc: 'Receive your private web portal with complete full-resolution archive.' },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <span className="font-headline text-4xl text-[#302921] font-bold block mb-2">
                  {step.num}
                </span>
                <h4 className="font-headline text-xl uppercase tracking-wider text-[#C8AD7F] mb-1.5">
                  {step.title}
                </h4>
                <p className="text-xs text-[#B7AEA2] font-light leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
              Common Inquiries
            </span>
            <h3 className="font-headline text-2xl md:text-4xl uppercase tracking-wide text-[#F2EDE4] mt-1">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-[#302921] bg-[#191713]/60 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-4 px-6 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className="font-condensed text-base uppercase tracking-wider text-[#F2EDE4]">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#C8AD7F] transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs text-[#B7AEA2] font-light leading-relaxed border-t border-[#302921]/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
