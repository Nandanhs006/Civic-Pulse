// Resolve a media URL (issue photo / audio) to something that loads regardless
// of which frontend origin is serving the app (Render single-service, or the
// Firebase Hosting mirror that talks to the Render API cross-origin).
//
//  - Absolute URLs (http/https: Wikimedia, GCS)        → used as-is
//  - Backend-uploaded files ("/static/…", "/uploads/…")→ served by the API, so
//    prepend the API base (empty on Render = same origin; Render URL on Firebase)
//  - Everything else ("/issue-images/…", "/images/…")  → bundled INTO the SPA and
//    served by whichever host is serving the frontend → keep relative
const API_BASE = import.meta.env.VITE_API_URL || '';

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/static/') || url.startsWith('/uploads/')) return API_BASE + url;
  return url;
}
