'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Calendar,
  Layers,
  Image as ImageIcon,
  FolderLock,
  Mail,
  HardDrive,
  LogOut,
  Check,
  X,
  Upload,
  Eye,
  Plus,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { AdminUser } from '@/lib/auth/session';

interface Props {
  admin: AdminUser;
}

export function AdminDashboardClient({ admin }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'bookings' | 'packages' | 'content' | 'galleries' | 'storage' | 'emails'>('bookings');

  // Bookings State
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [packagesSectionVisible, setPackagesSectionVisible] = useState(true);

  // Content Draft & Live State
  const [contentDraft, setContentDraft] = useState<any>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [contentStatus, setContentStatus] = useState<string | null>(null);

  // Galleries & Storage State
  const [clients, setClients] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any>(null);

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');

  // Load Bookings
  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch('/api/admin/bookings');
      const data = await res.json();
      if (data.bookings) setBookings(data.bookings);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Load Packages
  const loadPackages = async () => {
    try {
      const res = await fetch('/api/admin/packages');
      const data = await res.json();
      if (data.packages) setPackages(data.packages);
      if (data.packagesSectionVisible !== undefined) setPackagesSectionVisible(data.packagesSectionVisible);
    } catch {}
  };

  // Load Content
  const loadContent = async () => {
    try {
      const res = await fetch('/api/admin/content');
      const data = await res.json();
      if (data.draft) setContentDraft(data.draft);
    } catch {}
  };

  // Load Galleries
  const loadGalleries = async () => {
    try {
      const res = await fetch('/api/admin/galleries');
      const data = await res.json();
      if (data.clients) setClients(data.clients);
      if (data.storage) setStorageData(data.storage);
    } catch {}
  };

  useEffect(() => {
    loadBookings();
    loadPackages();
    loadContent();
    loadGalleries();
  }, []);

  const handleBookingAction = async (bookingId: string, action: 'approve' | 'decline' | 'cancel') => {
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, action }),
      });
      if (res.ok) {
        loadBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePackagesSection = async () => {
    const nextVal = !packagesSectionVisible;
    setPackagesSectionVisible(nextVal);
    await fetch('/api/admin/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_section_visibility', visible: nextVal }),
    });
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_draft', data: contentDraft }),
      });
      setContentStatus('Draft saved successfully');
      setTimeout(() => setContentStatus(null), 3000);
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishLive = async () => {
    setPublishing(true);
    try {
      await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', data: contentDraft }),
      });
      setContentStatus('Changes published to live portfolio!');
      setTimeout(() => setContentStatus(null), 4000);
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateClientAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/galleries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_client_album',
          clientName: newClientName,
          clientEmail: newClientEmail,
          albumTitle: newAlbumTitle,
          sessionDate: newSessionDate,
        }),
      });
      if (res.ok) {
        setNewClientName('');
        setNewClientEmail('');
        setNewAlbumTitle('');
        setNewSessionDate('');
        loadGalleries();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    await fetch('/api/admin/auth/login', { method: 'DELETE' });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0D0C0A] text-[#F2EDE4] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#14120E] border-r border-[#302921] flex flex-col justify-between shrink-0">
        <div>
          {/* Studio Brand */}
          <div className="p-6 border-b border-[#302921]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#C8AD7F]/40 flex items-center justify-center text-[#C8AD7F]">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-headline text-lg uppercase tracking-wider text-[#F2EDE4]">
                  Cinematic Chapters
                </h2>
                <span className="font-condensed text-[10px] uppercase tracking-widest text-[#806849]">
                  Studio Admin
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'bookings', label: 'Bookings & Requests', icon: Calendar },
              { id: 'packages', label: 'Package Offerings', icon: Layers },
              { id: 'content', label: 'Website Content', icon: Sparkles },
              { id: 'galleries', label: 'Private Client Galleries', icon: FolderLock },
              { id: 'storage', label: 'Storage & Capacity', icon: HardDrive },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-condensed text-xs uppercase tracking-wider text-left transition-all ${
                    isActive
                      ? 'bg-[#1F1B15] text-[#C8AD7F] border border-[#C8AD7F]/40 font-semibold shadow-sm'
                      : 'text-[#B7AEA2] hover:bg-[#191713] hover:text-[#F2EDE4]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-[#302921]">
          <div className="mb-3 px-2">
            <span className="text-[10px] text-[#806849] block">Signed in as</span>
            <span className="text-xs text-[#F2EDE4] font-mono truncate block">{admin.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#806849] hover:text-red-400 hover:bg-[#191713] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {/* TAB 1: BOOKINGS */}
        {activeTab === 'bookings' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4]">
                  Session Bookings
                </h1>
                <p className="text-xs text-[#B7AEA2]">
                  Review, approve, reschedule, or decline client requests. Overlaps are strictly prevented.
                </p>
              </div>
              <button onClick={loadBookings} className="capsule-button-outline text-xs py-2 px-4">
                Refresh
              </button>
            </div>

            {loadingBookings ? (
              <div className="py-12 text-center text-xs text-[#806849] font-mono animate-pulse">
                Loading session requests...
              </div>
            ) : bookings.length === 0 ? (
              <div className="glass-card-smoky p-12 text-center rounded-2xl border border-[#302921]">
                <Calendar className="w-8 h-8 text-[#806849] mx-auto mb-3" />
                <p className="text-xs text-[#B7AEA2]">No booking requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((bk) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-950/40 text-amber-300 border-amber-600/30',
                    confirmed: 'bg-emerald-950/40 text-emerald-300 border-emerald-600/30',
                    declined: 'bg-red-950/40 text-red-300 border-red-600/30',
                    cancelled: 'bg-zinc-800 text-zinc-400 border-zinc-700',
                    expired: 'bg-zinc-800 text-zinc-500 border-zinc-700',
                  };

                  return (
                    <div
                      key={bk.id}
                      className="glass-card-smoky rounded-xl p-6 border border-[#302921] flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
                              statusColors[bk.status] || ''
                            }`}
                          >
                            {bk.status}
                          </span>
                          <span className="text-xs text-[#806849] font-mono">
                            Ref: {bk.id}
                          </span>
                        </div>

                        <h3 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4]">
                          {bk.customer_name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#B7AEA2] mt-2">
                          <span>📅 {bk.session_date}</span>
                          <span>⏰ {new Date(bk.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>📦 {bk.package_snapshot?.name || 'Session'}</span>
                          <span>✉️ {bk.customer_email}</span>
                          <span>📞 {bk.customer_phone}</span>
                        </div>

                        {bk.location_notes && (
                          <p className="text-xs text-[#806849] mt-2 italic">
                            Location: {bk.location_notes}
                          </p>
                        )}
                      </div>

                      {/* Approval Actions */}
                      {bk.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleBookingAction(bk.id, 'approve')}
                            className="capsule-button-gold text-xs py-2 px-4 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleBookingAction(bk.id, 'decline')}
                            className="capsule-button-outline text-xs py-2 px-4 text-red-400 border-red-500/30 hover:border-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACKAGES */}
        {activeTab === 'packages' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4]">
                  Package Management
                </h1>
                <p className="text-xs text-[#B7AEA2]">
                  Duration-based packages (2hr, 4hr, Full Day). Bookings snapshot package details at request time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePackagesSection}
                  className={`capsule-button-outline text-xs py-2 px-4 ${
                    packagesSectionVisible ? 'text-[#C8AD7F] border-[#C8AD7F]' : 'text-[#806849]'
                  }`}
                >
                  {packagesSectionVisible ? 'Packages Section: Visible' : 'Packages Section: Hidden'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="glass-card-smoky rounded-2xl p-6 border border-[#302921]">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs text-[#806849]">{pkg.duration_minutes} Mins</span>
                    <span className="font-headline text-2xl font-bold text-[#C8AD7F]">
                      £{(pkg.price_in_pence / 100).toLocaleString('en-GB')}
                    </span>
                  </div>

                  <h3 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4] mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-xs text-[#B7AEA2] font-light mb-4">{pkg.description}</p>

                  <div className="text-[11px] text-[#806849] space-y-1 mb-6 border-t border-[#302921] pt-3">
                    <div>Allowance: {pkg.photo_allowance}</div>
                    <div>Delivery: {pkg.delivery_estimate}</div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#302921] text-xs">
                    <span className={pkg.is_accepting_bookings ? 'text-emerald-400' : 'text-zinc-500'}>
                      {pkg.is_accepting_bookings ? 'Accepting Requests' : 'Closed'}
                    </span>
                    <span className={pkg.is_public_visible ? 'text-[#C8AD7F]' : 'text-zinc-500'}>
                      {pkg.is_public_visible ? 'Published' : 'Hidden'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: WEBSITE CONTENT */}
        {activeTab === 'content' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4]">
                  Website Content Editor
                </h1>
                <p className="text-xs text-[#B7AEA2]">
                  Draft changes safely without affecting the live portfolio until you hit Publish.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="capsule-button-outline text-xs py-2 px-5"
                >
                  {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                </button>
                <button
                  onClick={handlePublishLive}
                  disabled={publishing}
                  className="capsule-button-gold text-xs py-2 px-6 shadow-gold-glow"
                >
                  {publishing ? 'Publishing...' : 'Publish to Live'}
                </button>
              </div>
            </div>

            {contentStatus && (
              <div className="mb-6 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs">
                {contentStatus}
              </div>
            )}

            <div className="space-y-6 max-w-4xl">
              {/* Brand & Hero */}
              <div className="glass-card-smoky p-6 rounded-2xl border border-[#302921]">
                <h3 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4] mb-4">
                  Brand Identity & Hero
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-condensed uppercase tracking-wider text-[#806849] block mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={contentDraft.brandName || ''}
                      onChange={(e) => setContentDraft({ ...contentDraft, brandName: e.target.value })}
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2 text-xs text-[#F2EDE4]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-condensed uppercase tracking-wider text-[#806849] block mb-1">
                      Hero Headline
                    </label>
                    <textarea
                      rows={3}
                      value={contentDraft.heroHeadline || ''}
                      onChange={(e) => setContentDraft({ ...contentDraft, heroHeadline: e.target.value })}
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2 text-xs text-[#F2EDE4]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-condensed uppercase tracking-wider text-[#806849] block mb-1">
                      Hero Subheadline
                    </label>
                    <textarea
                      rows={2}
                      value={contentDraft.heroSubheadline || ''}
                      onChange={(e) => setContentDraft({ ...contentDraft, heroSubheadline: e.target.value })}
                      className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2 text-xs text-[#F2EDE4]"
                    />
                  </div>
                </div>
              </div>

              {/* Team Quotation */}
              <div className="glass-card-smoky p-6 rounded-2xl border border-[#302921]">
                <h3 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4] mb-4">
                  Team Quotation
                </h3>
                <textarea
                  rows={2}
                  value={contentDraft.teamQuotation || ''}
                  onChange={(e) => setContentDraft({ ...contentDraft, teamQuotation: e.target.value })}
                  className="w-full bg-[#14120E] border border-[#302921] rounded-lg px-4 py-2 text-xs text-[#F2EDE4]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CLIENT GALLERIES */}
        {activeTab === 'galleries' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4]">
                  Private Client Galleries
                </h1>
                <p className="text-xs text-[#B7AEA2]">
                  Provision clients, generate access keys, upload full-resolution photographs, and monitor ZIP processing.
                </p>
              </div>
            </div>

            {/* Create Client Modal / Form */}
            <div className="glass-card-smoky p-6 rounded-2xl border border-[#302921] mb-8">
              <h3 className="font-headline text-lg uppercase tracking-wider text-[#C8AD7F] mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Client Album
              </h3>
              <form onSubmit={handleCreateClientAlbum} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Client Name (e.g. Maya & Sam)"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4]"
                />
                <input
                  type="email"
                  required
                  placeholder="Client Email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  className="bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4]"
                />
                <input
                  type="text"
                  required
                  placeholder="Album Title"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  className="bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4]"
                />
                <input
                  type="date"
                  required
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="bg-[#14120E] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4]"
                />
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <button type="submit" className="capsule-button-gold text-xs py-2.5 px-6">
                    Create Album & Generate Key
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Clients List */}
            <div className="space-y-4">
              {clients.map((client) => (
                <div key={client.id} className="glass-card-smoky rounded-xl p-6 border border-[#302921]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-headline text-xl uppercase tracking-wide text-[#F2EDE4]">
                        {client.name}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-[#806849] mt-1">
                        <span>✉️ {client.email}</span>
                        <span>
                          Key: <code className="text-[#C8AD7F] font-mono">{client.access_token}</code>
                        </span>
                        <span className={client.access_revoked ? 'text-red-400' : 'text-emerald-400'}>
                          {client.access_revoked ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const album = client.albums?.[0];
                          if (album) {
                            await fetch('/api/admin/galleries', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'send_gallery_ready', clientId: client.id, albumId: album.id }),
                            });
                            alert('Notification email queued for client!');
                          }
                        }}
                        className="capsule-button-outline text-xs py-2 px-4"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Send Ready Email
                      </button>
                    </div>
                  </div>

                  {/* Albums */}
                  <div className="space-y-2 pt-4 border-t border-[#302921]">
                    {client.albums?.map((alb: any) => (
                      <div key={alb.id} className="bg-[#14120E] p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="font-headline text-base text-[#F2EDE4] uppercase">{alb.title}</h4>
                          <span className="text-[11px] text-[#806849]">
                            {alb.photo_count} Photos • Total: {(alb.total_bytes / (1024 * 1024)).toFixed(1)} MB • ZIP: {alb.zip_status}
                          </span>
                        </div>

                        {/* Direct File Upload */}
                        <label className="capsule-button-gold text-xs py-1.5 px-3 cursor-pointer">
                          <Upload className="w-3 h-3" />
                          Add Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const form = new FormData();
                              form.append('albumId', alb.id);
                              form.append('file', file);
                              await fetch('/api/admin/galleries/upload', {
                                method: 'POST',
                                body: form,
                              });
                              loadGalleries();
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: STORAGE & CAPACITY */}
        {activeTab === 'storage' && (
          <div>
            <div className="mb-8">
              <h1 className="font-headline text-3xl uppercase tracking-wide text-[#F2EDE4]">
                Storage & Capacity Accounting
              </h1>
              <p className="text-xs text-[#B7AEA2]">
                Detailed volume tracking across private client RAWs/previews, archives, and public assets.
              </p>
            </div>

            {storageData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="glass-card-smoky p-6 rounded-2xl border border-[#302921]">
                    <span className="text-xs font-condensed uppercase tracking-wider text-[#806849]">
                      Total Used
                    </span>
                    <div className="font-headline text-3xl text-[#C8AD7F] mt-2">
                      {(storageData.usedBytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                    <span className="text-[10px] text-[#806849]">of 50.0 GB Configured Allowance</span>
                  </div>

                  <div className="glass-card-smoky p-6 rounded-2xl border border-[#302921]">
                    <span className="text-xs font-condensed uppercase tracking-wider text-[#806849]">
                      Private Client Assets
                    </span>
                    <div className="font-headline text-3xl text-[#F2EDE4] mt-2">
                      {(storageData.privateBytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                    <span className="text-[10px] text-[#806849]">Full-res originals & web previews</span>
                  </div>

                  <div className="glass-card-smoky p-6 rounded-2xl border border-[#302921]">
                    <span className="text-xs font-condensed uppercase tracking-wider text-[#806849]">
                      Capacity Health
                    </span>
                    <div className="font-headline text-3xl text-emerald-400 mt-2">
                      {storageData.usedPercentage}%
                    </div>
                    <span className="text-[10px] text-[#806849]">Warning threshold: 80%</span>
                  </div>
                </div>

                {storageData.isLowStorageWarning && (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span>Low Storage Warning: Current usage exceeds 80% of configured allowance.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
