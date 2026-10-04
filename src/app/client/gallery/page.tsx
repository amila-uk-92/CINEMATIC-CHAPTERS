import { getClientSession } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Download, Calendar, ShieldCheck, Camera, LogOut } from 'lucide-react';

export const revalidate = 0;

export default async function ClientGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  let client = await getClientSession();

  // If token is passed in query string, auto authenticate
  if (!client && resolvedSearchParams.token) {
    const res = await query(
      `SELECT * FROM clients WHERE access_token = $1 AND access_revoked = false`,
      [resolvedSearchParams.token]
    );
    if (res.rows.length > 0) {
      client = res.rows[0];
    }
  }

  if (!client) {
    redirect('/client/login');
  }

  // Fetch client albums
  const albumsRes = await query(
    `SELECT * FROM albums WHERE client_id = $1 AND is_archived = false ORDER BY session_date DESC`,
    [client.id]
  );
  const albums = albumsRes.rows;

  if (albums.length === 0) {
    return (
      <div className="min-h-screen bg-[#0D0C0A] flex items-center justify-center p-6 text-center">
        <div className="max-w-md glass-card-smoky p-8 rounded-2xl border border-[#302921]">
          <h2 className="font-headline text-2xl uppercase text-[#F2EDE4] mb-2">No Active Gallery</h2>
          <p className="text-xs text-[#B7AEA2]">
            Your session is currently being graded and edited. We will notify you once your gallery is ready.
          </p>
        </div>
      </div>
    );
  }

  const activeAlbum = albums[0];

  // Fetch album photos
  const photosRes = await query(
    `SELECT * FROM album_photos WHERE album_id = $1 ORDER BY created_at ASC`,
    [activeAlbum.id]
  );
  const photos = photosRes.rows;

  const formattedDate = new Date(activeAlbum.session_date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedExpiry = activeAlbum.expires_at
    ? new Date(activeAlbum.expires_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Never';

  const downloadSizeMb = activeAlbum.zip_size_bytes
    ? (activeAlbum.zip_size_bytes / (1024 * 1024)).toFixed(1)
    : (activeAlbum.total_bytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="min-h-screen bg-[#0D0C0A] text-[#F2EDE4] flex flex-col">
      {/* Portal Header */}
      <header className="bg-[#14120E] border-b border-[#302921] py-4 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[#C8AD7F]/40 flex items-center justify-center text-[#C8AD7F]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-headline text-lg uppercase tracking-wider text-[#F2EDE4]">
                Cinematic Chapters
              </h1>
              <span className="font-condensed text-[10px] uppercase tracking-widest text-[#806849]">
                Private Client Portal • {client.name}
              </span>
            </div>
          </div>

          <form action="/api/client/auth/login" method="DELETE">
            <button
              type="submit"
              className="flex items-center gap-1.5 font-condensed text-xs uppercase tracking-wider text-[#806849] hover:text-[#C8AD7F]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Album Hero Info & Single Download Action */}
      <section className="py-12 px-6 md:px-12 bg-gradient-to-b from-[#14120E] to-[#0D0C0A] border-b border-[#302921]/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1 text-xs text-[#806849] font-mono">
                <Calendar className="w-3.5 h-3.5 text-[#C8AD7F]" />
                Session Date: {formattedDate}
              </span>
              <span className="text-xs text-[#806849]">•</span>
              <span className="text-xs text-[#806849] font-mono">
                {photos.length} High-Res Frames
              </span>
            </div>

            <h2 className="font-headline text-3xl md:text-5xl uppercase tracking-wide text-[#F2EDE4]">
              {activeAlbum.title}
            </h2>

            {activeAlbum.description && (
              <p className="text-xs text-[#B7AEA2] mt-2 max-w-xl font-light">
                {activeAlbum.description}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-[#806849]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C8AD7F]" />
              <span>Gallery access active until {formattedExpiry}</span>
            </div>
          </div>

          {/* Download All Photos Action */}
          <div className="flex flex-col items-start md:items-end gap-2">
            {activeAlbum.zip_status === 'ready' && activeAlbum.zip_storage_key ? (
              <a
                href={`/api/storage/private/${activeAlbum.zip_storage_key}`}
                download
                className="capsule-button-gold text-xs py-3.5 px-8 shadow-gold-glow"
              >
                <Download className="w-4 h-4" />
                Download All Photos ({downloadSizeMb} MB)
              </a>
            ) : (
              <form action="/api/client/album-zip" method="POST">
                <input type="hidden" name="albumId" value={activeAlbum.id} />
                <button
                  type="submit"
                  className="capsule-button-gold text-xs py-3.5 px-8"
                >
                  <Download className="w-4 h-4" />
                  Prepare Complete ZIP Archive
                </button>
              </form>
            )}
            <span className="text-[11px] text-[#806849] max-w-xs text-left md:text-right font-light">
              Full-resolution archival package. Individual image downloads are disabled to preserve album cohesion.
            </span>
          </div>
        </div>
      </section>

      {/* Web-sized Preview Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-6 md:px-12 py-12 w-full">
        {photos.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#302921] rounded-2xl">
            <p className="text-xs text-[#B7AEA2]">
              Photographs for this album are currently in post-production.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="break-inside-avoid relative rounded-xl overflow-hidden border border-[#302921] group transition-all duration-300 hover:border-[#C8AD7F]/50 shadow-glass"
              >
                <img
                  src={`/api/storage/private/${photo.preview_storage_key}`}
                  alt={photo.original_name}
                  loading="lazy"
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0C0A]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end">
                  <span className="text-[11px] font-mono text-[#F2EDE4] truncate">
                    {photo.original_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
