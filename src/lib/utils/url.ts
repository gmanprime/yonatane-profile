/**
 * Safely extracts a URL string from a polymorphic value (string, object with url/href/link).
 */
export function extractUrl(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url.trim();
    if (typeof obj.href === 'string') return obj.href.trim();
    if (typeof obj.link === 'string') return obj.link.trim();
  }
  return '';
}

/**
 * Returns a valid href with protocol (https:// fallback).
 */
export function formatHref(raw: unknown): string {
  const url = extractUrl(raw);
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Returns a clean, user-friendly label for a URL.
 */
export function formatUrlLabel(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.label === 'string' && obj.label.trim()) {
      return obj.label.trim();
    }
  }
  const url = extractUrl(raw);
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
