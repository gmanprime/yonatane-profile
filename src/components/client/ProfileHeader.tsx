'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QRShareModal } from './QRShareModal';
import { formatHref, formatUrlLabel } from '@/lib/utils/url';
import styles from './client.module.css';

export interface CareerStat {
  value: string;
  label: string;
}

interface ProfileHeaderProps {
  basics: Record<string, unknown>;
  summary?: string | null;
  picture?: Record<string, unknown> | null;
  profileName?: string;
  hash?: string;
  hasPortfolio?: boolean;
  statusText?: string;
  stats?: CareerStat[];
  onOpenQR?: () => void;
  compact?: boolean;
  onSelectAbout?: () => void;
}

// Contact & Brand Icon Components
export const MailIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const PhoneIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const MapPinIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const GitHubIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const GlobeIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const ShieldCheckIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const CalendarIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const CompassIcon = () => (
  <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

export function getCustomFieldIcon(iconName?: string, text?: string, link?: string) {
  const normIcon = (iconName || '').toLowerCase();
  const normText = (text || '').toLowerCase();
  const normLink = (link || '').toLowerCase();

  if (
    normIcon.includes('address') ||
    normIcon.includes('shield') ||
    normIcon.includes('passport') ||
    normText.includes('citizen') ||
    normText.includes('passport')
  ) {
    return <ShieldCheckIcon />;
  }
  if (
    normIcon.includes('calendar') ||
    normIcon.includes('dob') ||
    normText.match(/\b(19\d\d|20\d\d)\b/)
  ) {
    return <CalendarIcon />;
  }
  if (
    normIcon.includes('compass') ||
    normIcon.includes('map') ||
    normIcon.includes('pin') ||
    normIcon.includes('location')
  ) {
    return <CompassIcon />;
  }
  if (normIcon.includes('github') || normLink.includes('github.com')) {
    return <GitHubIcon />;
  }
  if (normIcon.includes('globe') || normIcon.includes('web') || normLink.startsWith('http')) {
    return <GlobeIcon />;
  }
  return <MapPinIcon />;
}

export const DEFAULT_CAREER_STATS: CareerStat[] = [
  { value: '3+ Yrs', label: 'AI & GIS Research' },
  { value: '4 Deep', label: 'Case Studies' },
  { value: 'M.Sc. & B.Sc.', label: 'Dual Degrees' },
  { value: '1st Class', label: 'Honours' },
];

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  basics,
  summary,
  picture,
  profileName,
  hash,
  hasPortfolio,
  statusText = 'Available for AI & Systems Roles',
  stats = DEFAULT_CAREER_STATS,
  onOpenQR,
  compact = false,
  onSelectAbout,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  const name = (basics.name as string) || profileName || 'Yonatan Elias';
  const headline = (basics.headline as string) || (basics.label as string) || '';
  const email = (basics.email as string) || '';
  const phone = (basics.phone as string) || '';
  const location =
    typeof basics.location === 'string'
      ? basics.location
      : (basics.location as Record<string, string>)?.city
      ? `${(basics.location as Record<string, string>).city}${(basics.location as Record<string, string>).country ? `, ${(basics.location as Record<string, string>).country}` : ''}`
      : (basics.location as Record<string, string>)?.address || '';

  const websiteHref = formatHref(basics.website || basics.url);
  const websiteLabel = formatUrlLabel(basics.website || basics.url);
  const isGitHubWebsite = (websiteHref || '').toLowerCase().includes('github.com');
  const customFields = (basics.customFields as Array<Record<string, unknown>>) || [];

  const pictureUrl = (picture?.url as string) || (basics.picture as string) || null;
  const pictureEffects = (picture?.effects as Record<string, unknown>) || {};
  const isGrayscale = Boolean(pictureEffects.grayscale);
  const customBorderRadius = typeof picture?.borderRadius === 'number' ? `${picture.borderRadius}%` : undefined;
  const customObjectPosition = (picture?.objectPosition as string) || 'center 20%';

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://yonatanelias.dpdns.org';
  const pdfDownloadUrl = `/api/v1/public/profile/${hash && hash !== 'default' ? hash : 'default'}/pdf`;

  const blogPath = hash && hash !== 'default' ? `/p/${hash}/blog` : '/portfolio';

  if (compact) {
    return (
      <header className={styles.heroBannerCompact}>
        {/* Candidate Avatar Studio with Animated Luminous Halo */}
        <div
          className={`${styles.avatarStudio} ${onSelectAbout ? styles.avatarStudioClickable : ''}`}
          onClick={onSelectAbout}
          role={onSelectAbout ? 'button' : undefined}
          tabIndex={onSelectAbout ? 0 : undefined}
          onKeyDown={onSelectAbout ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelectAbout() : undefined}
          aria-label={onSelectAbout ? 'Navigate to About & Overview section' : undefined}
          title={onSelectAbout ? 'Click to view About & Overview' : undefined}
        >
          <div className={styles.avatarHaloRing} aria-hidden="true" />
          <div className={styles.avatarWrapper}>
            {pictureUrl && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureUrl}
                alt={name}
                className={styles.avatarImage}
                style={{
                  filter: isGrayscale ? 'grayscale(100%)' : undefined,
                  borderRadius: customBorderRadius,
                  objectPosition: customObjectPosition,
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={styles.avatarInitials}>
                {initials || 'YE'}
              </div>
            )}
          </div>

          {/* Live Availability Status Badge */}
          <div className={styles.statusBadge}>
            <span className={styles.statusDotWrapper}>
              <span className={styles.statusDotPing} />
              <span className={styles.statusDotCore} />
            </span>
            <span className={styles.statusText}>{statusText}</span>
          </div>
        </div>

        {/* Name & Headline */}
        <h1 className={styles.candidateNameCompact}>{name}</h1>
        {headline && <div className={styles.candidateHeadlineCompact}>{headline}</div>}
      </header>
    );
  }

  return (
    <>
      <header className={styles.heroBanner}>
        <div className={styles.heroAccentLine} />

        {/* Candidate Avatar Studio with Animated Luminous Halo */}
        <div className={styles.avatarStudio}>
          <div className={styles.avatarHaloRing} aria-hidden="true" />
          <div className={styles.avatarWrapper}>
            {pictureUrl && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureUrl}
                alt={name}
                className={styles.avatarImage}
                style={{
                  filter: isGrayscale ? 'grayscale(100%)' : undefined,
                  borderRadius: customBorderRadius,
                  objectPosition: customObjectPosition,
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={styles.avatarInitials}>
                {initials || 'YE'}
              </div>
            )}
          </div>

          {/* Live Availability Status Badge */}
          <div className={styles.statusBadge}>
            <span className={styles.statusDotWrapper}>
              <span className={styles.statusDotPing} />
              <span className={styles.statusDotCore} />
            </span>
            <span className={styles.statusText}>{statusText}</span>
          </div>
        </div>

        {/* Name & Headline */}
        <h1 className={styles.candidateName}>{name}</h1>
        {headline && <div className={styles.candidateHeadline}>{headline}</div>}

        {/* Career Metric Highlights (Bento Stat Row) */}
        {stats && stats.length > 0 && (
          <div className={styles.heroStatsGrid}>
            {stats.map((stat, idx) => (
              <div key={idx} className={styles.statTile}>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bio Summary */}
        {summary && (
          <div
            className={styles.bioSummary}
            dangerouslySetInnerHTML={{ __html: summary }}
          />
        )}

        {/* Glassmorphic Contact Chips */}
        <div className={styles.contactBar}>
          {email && (
            <a href={`mailto:${email}`} className={styles.contactChip} title="Send Email">
              <MailIcon />
              <span>{email}</span>
            </a>
          )}

          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className={styles.contactChip} title="Call Phone">
              <PhoneIcon />
              <span>{phone}</span>
            </a>
          )}

          {location && (
            <span className={styles.contactChip} title="Location">
              <MapPinIcon />
              <span>{location}</span>
            </span>
          )}

          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactChip}
              title="Visit Website / Portfolio"
            >
              {isGitHubWebsite ? <GitHubIcon /> : <GlobeIcon />}
              <span>{websiteLabel}</span>
            </a>
          )}

          {customFields.map((cf, idx) => {
            const fieldText = (cf.text as string) || (cf.value as string) || (cf.name as string) || '';
            const fieldName = (cf.name as string) && (cf.value as string) ? (cf.name as string) : '';
            const fieldValue = (cf.name as string) && (cf.value as string) ? (cf.value as string) : fieldText;
            const fieldLink = formatHref(cf.link || cf.url);
            const fieldIconName = (cf.icon as string) || '';

            if (!fieldText && !fieldValue && !fieldName) return null;

            const iconElement = getCustomFieldIcon(fieldIconName, fieldText, fieldLink);

            if (fieldLink) {
              return (
                <a
                  key={(cf.id as string) || `cf-${idx}`}
                  href={fieldLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactChip}
                >
                  {iconElement}
                  {fieldName && fieldValue ? (
                    <>
                      <span className={styles.contactChipLabel}>{fieldName}:</span>
                      <span>{fieldValue}</span>
                    </>
                  ) : (
                    <span>{fieldValue || fieldText}</span>
                  )}
                </a>
              );
            }

            return (
              <span key={(cf.id as string) || `cf-${idx}`} className={styles.contactChip}>
                {iconElement}
                {fieldName && fieldValue ? (
                  <>
                    <span className={styles.contactChipLabel}>{fieldName}:</span>
                    <span>{fieldValue}</span>
                  </>
                ) : (
                  <span>{fieldValue || fieldText}</span>
                )}
              </span>
            );
          })}
        </div>

        {/* Action CTAs */}
        <div className={styles.heroActions}>
          <a
            href={pdfDownloadUrl}
            download="Yonatan_Elias_Resume.pdf"
            className={styles.primaryActionBtn}
            title="Download formatted official PDF resume"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Resume PDF</span>
          </a>

          <button
            type="button"
            onClick={onOpenQR ? onOpenQR : () => setShowQRModal(true)}
            className={styles.secondaryActionBtn}
            title="Share & QR Code"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Share / QR</span>
          </button>

          {hasPortfolio && (
            <Link
              href={blogPath}
              className={styles.secondaryActionBtn}
              title="Explore engineering case studies"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>Portfolio & Blog</span>
            </Link>
          )}
        </div>
      </header>

      {/* Share / QR Modal (fallback if not managed by parent) */}
      {!onOpenQR && (
        <QRShareModal
          url={currentUrl}
          name={name}
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </>
  );
};
