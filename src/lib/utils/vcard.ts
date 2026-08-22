export interface VCardOptions {
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  websiteUrl?: string;
  githubUrl?: string;
  company?: string;
  title?: string;
  birthday?: string; // e.g. "9 May" or "--05-09"
  addressState?: string;
  note?: string;
}

/**
 * Parses birthday string (e.g. "9 May 1997" or "May 9") into month and day without year (e.g. "--05-09")
 */
function formatBirthdayNoYear(bdayStr?: string): string | null {
  if (!bdayStr) return null;
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };

  const clean = bdayStr.toLowerCase();
  for (const [mName, mNum] of Object.entries(months)) {
    if (clean.includes(mName)) {
      const match = clean.match(/\b([0-9]{1,2})\b/);
      if (match) {
        const day = match[1].padStart(2, '0');
        return `--${mNum}-${day}`;
      }
    }
  }
  return null;
}

/**
 * Formats a clean standard vCard 3.0 string for QR codes and .vcf downloads.
 */
export function generateVCard(opts: VCardOptions): string {
  const parts = (opts.name || 'Yonatan Elias').trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const firstName = parts[0] || '';

  const title = opts.title || opts.headline || 'Computational Data Scientist & Full-Stack Developer';
  const org = opts.company || 'Independent / Open to Opportunities';
  const bdayFormatted = formatBirthdayNoYear(opts.birthday);

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${opts.name}`,
  ];

  if (title) {
    lines.push(`TITLE:${title}`);
    lines.push(`ROLE:${title}`);
  }

  if (org) {
    lines.push(`ORG:${org}`);
  }

  if (opts.phone) {
    const cleanPhone = opts.phone.replace(/[^\d+]/g, '');
    lines.push(`TEL;TYPE=CELL,VOICE;VALUE=uri:tel:${cleanPhone || opts.phone}`);
  }

  if (opts.email) {
    lines.push(`EMAIL;TYPE=INTERNET,WORK,PREF:${opts.email}`);
  }

  if (opts.websiteUrl) {
    lines.push(`URL;TYPE=WORK:${opts.websiteUrl}`);
  }

  if (opts.githubUrl && opts.githubUrl !== opts.websiteUrl) {
    lines.push(`URL;TYPE=GitHub:${opts.githubUrl}`);
  }

  if (opts.location || opts.addressState) {
    const loc = opts.addressState || opts.location || '';
    lines.push(`ADR;TYPE=WORK:;;;${loc};;;`);
  }

  if (bdayFormatted) {
    lines.push(`BDAY:${bdayFormatted}`);
  }

  if (opts.note) {
    // Escape newlines for vCard
    const escapedNote = opts.note.replace(/\n/g, '\\n').replace(/,/g, '\\,');
    lines.push(`NOTE:${escapedNote}`);
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Creates and triggers a download of a .vcf contact card file in the browser.
 */
export function downloadVCardFile(vcardText: string, filename = 'contact.vcf') {
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
