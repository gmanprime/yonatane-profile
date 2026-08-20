'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QRShareModal } from './QRShareModal';
import { formatHref, formatUrlLabel } from '@/lib/utils/url';
import styles from './client.module.css';

interface ProfileHeaderProps {
  basics: Record<string, unknown>;
  summary?: string | null;
  picture?: Record<string, unknown> | null;
  profileName?: string;
  hash?: string;
  hasPortfolio?: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  basics,
  summary,
  picture,
  profileName,
  hash,
  hasPortfolio,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);

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
  const customFields = (basics.customFields as Array<Record<string, unknown>>) || [];

  const pictureUrl = (picture?.url as string) || (basics.picture as string) || null;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://yonatanelias.dpdns.org';

  const handlePrint = () => {
    window.print();
  };

  const blogPath = hash && hash !== 'default' ? `/p/${hash}/blog` : '/portfolio';

  return (
    <>
      <header className={styles.heroBanner}>
        <div className={styles.heroAccentLine} />

        {/* Candidate Avatar */}
        <div className={styles.avatarWrapper}>
          {pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pictureUrl}
              alt={name}
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatarInitials}>
              {initials || 'YE'}
            </div>
          )}
        </div>

        {/* Name & Headline */}
        <h1 className={styles.candidateName}>{name}</h1>
        {headline && <div className={styles.candidateHeadline}>{headline}</div>}

        {/* Bio Summary */}
        {summary && (
          <div
            className={styles.bioSummary}
            dangerouslySetInnerHTML={{ __html: summary }}
          />
        )}

        {/* Contact Info Pills */}
        <div className={styles.contactBar}>
          {email && (
            <a href={`mailto:${email}`} className={styles.contactItem}>
              <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{email}</span>
            </a>
          )}

          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className={styles.contactItem}>
              <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{phone}</span>
            </a>
          )}

          {location && (
            <span className={styles.contactItem}>
              <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{location}</span>
            </span>
          )}

          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactItem}
            >
              <svg className={styles.contactIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{websiteLabel}</span>
            </a>
          )}

          {customFields.map((cf, idx) => {
            const fieldName = (cf.name as string) || (cf.text as string) || '';
            const fieldValue = (cf.value as string) || '';
            const fieldLink = formatHref(cf.link || cf.url);

            if (!fieldName && !fieldValue) return null;

            if (fieldLink) {
              return (
                <a
                  key={(cf.id as string) || `cf-${idx}`}
                  href={fieldLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactItem}
                >
                  {fieldValue ? (
                    <>
                      <span style={{ fontWeight: 600, color: 'var(--theme-accent)' }}>{fieldName}:</span>
                      <span>{fieldValue}</span>
                    </>
                  ) : (
                    <span>{fieldName}</span>
                  )}
                </a>
              );
            }

            return (
              <span key={(cf.id as string) || `cf-${idx}`} className={styles.contactItem}>
                {fieldValue ? (
                  <>
                    <span style={{ fontWeight: 600, color: 'var(--theme-accent)' }}>{fieldName}:</span>
                    <span>{fieldValue}</span>
                  </>
                ) : (
                  <span>{fieldName}</span>
                )}
              </span>
            );
          })}
        </div>

        {/* Action CTAs */}
        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={handlePrint}
            className={styles.primaryActionBtn}
            title="Download formatted PDF resume"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download Resume PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQRModal(true)}
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

      {/* Share / QR Modal */}
      <QRShareModal
        url={currentUrl}
        name={name}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </>
  );
};
