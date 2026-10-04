'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { PackageData } from './PackagesSection';

interface BookingCalendarProps {
  packages: PackageData[];
  preselectedPackageId?: string;
}

export function BookingCalendar({ packages, preselectedPackageId }: BookingCalendarProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    preselectedPackageId || packages[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResponse, setSuccessResponse] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) || packages[0];

  // Set default date to 3 days ahead in Europe/London
  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 3);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch real availability slots when date or package changes
  useEffect(() => {
    if (!selectedDate || !selectedPkg) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot('');
      try {
        const res = await fetch(
          `/api/booking/availability?date=${selectedDate}&duration=${selectedPkg.duration_minutes}`
        );
        const data = await res.json();
        if (data.slots) {
          setAvailableSlots(data.slots);
          if (data.slots.length > 0) {
            setSelectedSlot(data.slots[0]);
          }
        }
      } catch {
        // Fallback demo slots
        const demo = ['09:30', '13:00', '16:30'];
        setAvailableSlots(demo);
        setSelectedSlot(demo[0]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDate, selectedPkg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage('Please pick an available time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/booking/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          sessionDate: selectedDate,
          startTimeStr: selectedSlot,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          locationNotes,
          customerMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit booking request.');
      }

      setSuccessResponse(data.booking);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="booking" className="py-24 bg-[#0D0C0A] relative border-t border-[#302921]/40">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-condensed text-xs uppercase tracking-[0.25em] text-[#806849]">
            Shared Studio Calendar
          </span>
          <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4] mt-2">
            Request Your Session
          </h2>
          <p className="text-xs md:text-sm text-[#B7AEA2] mt-3 font-light">
            Both photographers operate from a single coordinated calendar. Time slots are held immediately upon submission and validated with Europe/London daylight savings.
          </p>
        </div>

        {successResponse ? (
          <div className="glass-card-smoky rounded-2xl p-8 md:p-12 border border-[#C8AD7F]/50 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#191713] border border-[#C8AD7F] flex items-center justify-center text-[#C8AD7F] mx-auto mb-6 shadow-gold-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <span className="font-condensed text-xs uppercase tracking-[0.2em] text-[#C8AD7F] block mb-2">
              Request Successfully Queued
            </span>
            <h3 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4] mb-4">
              We&apos;re Reviewing Your Date
            </h3>
            <p className="text-xs text-[#B7AEA2] leading-relaxed mb-6 font-light">
              Thank you, <strong>{successResponse.customer_name}</strong>. Your requested session for{' '}
              <strong>{successResponse.session_date}</strong> at <strong>{selectedSlot}</strong> has been placed in pending review. An acknowledgement email has been queued to{' '}
              <strong>{successResponse.customer_email}</strong>.
            </p>
            <div className="p-4 rounded-xl bg-[#14120E] border border-[#302921] text-xs text-[#806849] mb-8">
              Booking Ref: <code className="text-[#C8AD7F] font-mono">{successResponse.id}</code>
            </div>
            <button
              onClick={() => {
                setSuccessResponse(null);
                setSelectedSlot('');
              }}
              className="capsule-button-outline text-xs"
            >
              Book Another Date
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Step 1 & 2: Package & Date/Slot Selection */}
            <div className="lg:col-span-7 space-y-6">
              {/* Package Selector */}
              <div className="glass-card-smoky rounded-2xl p-6 border border-[#302921]">
                <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-3 font-semibold">
                  1. Select Duration Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {packages.map((pkg) => {
                    const isSelected = pkg.id === selectedPackageId;
                    return (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-[#1F1B15] border-[#C8AD7F] shadow-sm'
                            : 'bg-[#14120E] border-[#302921] hover:border-[#806849]'
                        }`}
                      >
                        <div className="font-headline text-sm uppercase text-[#F2EDE4] truncate">
                          {pkg.name}
                        </div>
                        <div className="text-xs font-bold text-[#C8AD7F] mt-1">
                          £{(pkg.price_in_pence / 100).toLocaleString('en-GB')}
                        </div>
                        <div className="text-[10px] text-[#806849] mt-0.5">
                          {pkg.duration_minutes} Mins
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Slots */}
              <div className="glass-card-smoky rounded-2xl p-6 border border-[#302921]">
                <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-3 font-semibold">
                  2. Pick Date & Available Slot (Europe/London)
                </label>

                <div className="mb-6">
                  <div className="flex items-center gap-3 bg-[#14120E] border border-[#302921] rounded-xl px-4 py-3">
                    <CalendarIcon className="w-4 h-4 text-[#C8AD7F]" />
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs text-[#F2EDE4] focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div>
                  <span className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-2">
                    Available Time Slots for Selected Day:
                  </span>
                  {loadingSlots ? (
                    <div className="py-6 text-center text-xs text-[#806849] font-mono animate-pulse">
                      Checking photographer availability...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#B7AEA2] bg-[#14120E] rounded-xl border border-[#302921]">
                      No available slots for this date. Please pick another day.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map((slot) => {
                        const isSlotSelected = selectedSlot === slot;
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-2.5 px-3 rounded-lg font-mono text-xs text-center border transition-all ${
                              isSlotSelected
                                ? 'bg-[#C8AD7F] text-[#0D0C0A] font-bold border-[#C8AD7F]'
                                : 'bg-[#14120E] border-[#302921] text-[#F2EDE4] hover:border-[#806849]'
                            }`}
                          >
                            <Clock className="w-3 h-3 inline-block mr-1 opacity-70" />
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Contact Details & Submit */}
            <div className="lg:col-span-5">
              <div className="glass-card-smoky rounded-2xl p-6 border border-[#302921]">
                <label className="font-condensed text-xs uppercase tracking-wider text-[#806849] block mb-4 font-semibold">
                  3. Contact & Session Details
                </label>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-condensed uppercase tracking-wider text-[#B7AEA2] block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jessica Davies"
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-condensed uppercase tracking-wider text-[#B7AEA2] block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jessica@example.co.uk"
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-condensed uppercase tracking-wider text-[#B7AEA2] block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7700 900077"
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-condensed uppercase tracking-wider text-[#B7AEA2] block mb-1">
                      Location or Venue Idea
                    </label>
                    <input
                      type="text"
                      value={locationNotes}
                      onChange={(e) => setLocationNotes(e.target.value)}
                      placeholder="e.g. Bradgate Park, Leicester Old Town, etc."
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-condensed uppercase tracking-wider text-[#B7AEA2] block mb-1">
                      Creative Notes & Vision
                    </label>
                    <textarea
                      rows={3}
                      value={customerMessage}
                      onChange={(e) => setCustomerMessage(e.target.value)}
                      placeholder="Tell us what atmosphere or story you're looking to create..."
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#302921]">
                  <div className="text-xs text-[#806849] mb-4">
                    Acknowledgement: Submitting holds your requested slot while both photographers check travel and schedule feasibility. No instant payment required.
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    className="w-full capsule-button-gold text-xs py-3.5 tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shadow-gold-glow"
                  >
                    {submitting ? 'Holding Reservation...' : 'Submit Booking Request'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
