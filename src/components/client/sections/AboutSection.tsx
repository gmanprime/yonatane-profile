'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QRShareModal } from '../QRShareModal';
import { formatHref, formatUrlLabel } from '@/lib/utils/url';
import {
  type CareerStat,
  DEFAULT_CAREER_STATS,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GitHubIcon,
  GlobeIcon,
  getCustomFieldIcon,
} from '../ProfileHeader';
import styles from '../client.module.css';

interface AboutSectionProps {
  basics: Record<string, unknown>;
  summary?: string | null;
  profileName?: string;
  hash?: string;
  hasPortfolio?: boolean;
  stats?: CareerStat[];
  onOpenQR?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  basics,
  summary,
  profileName,
  hash,
  hasPortfolio,
  stats = DEFAULT_CAREER_STATS,
  onOpenQR,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);

  const name = (basics.name as string) || profileName || 'Yonatan Elias';
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
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://yonatanelias.dpdns.org';

  const handlePrint = () => {
    window.print();
  };

  const blogPath = hash && hash !== 'default' ? `/p/${hash}/blog` : '/portfolio';

  return (
    <div className={styles.aboutSplashContainer}>
      {/* 4 Hoverable Bento Metric & Career Highlights Tiles */}
      {stats && stats.length > 0 && (
        <div className={styles.aboutStatsGrid}>
          {stats.map((stat, idx) => (
            <div key={idx} className={styles.aboutStatTile}>
              <div className={styles.aboutStatValue}>{stat.value}</div>
              <div className={styles.aboutStatLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bio Summary & Career Narrative */}
      {summary && (
        <div className={styles.aboutBioCard}>
          <div className={styles.aboutBioHeading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Executive Overview & Research Focus</span>
          </div>
          <div
            className={styles.aboutBioContent}
            dangerouslySetInnerHTML={{ __html: summary }}
          />
        </div>
      )}

      {/* Glassmorphic Contact & Reach Details */}
      <div className={styles.aboutContactCard}>
        <div className={styles.aboutContactHeading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>Direct Contact & Profiles</span>
        </div>

        <div className={styles.aboutContactGrid}>
          {email && (
            <a href={`mailto:${email}`} className={styles.contactTile} title="Send Email">
              <div className={styles.contactTileIconWrap}>
                <MailIcon />
              </div>
              <div className={styles.contactTileTextWrap}>
                <span className={styles.contactTileLabel}>Email</span>
                <span className={styles.contactTileValue}>{email}</span>
              </div>
            </a>
          )}

          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className={styles.contactTile} title="Call Phone">
              <div className={styles.contactTileIconWrap}>
                <PhoneIcon />
              </div>
              <div className={styles.contactTileTextWrap}>
                <span className={styles.contactTileLabel}>Phone</span>
                <span className={styles.contactTileValue}>{phone}</span>
              </div>
            </a>
          )}

          {location && (
            <div className={styles.contactTile} title="Location">
              <div className={styles.contactTileIconWrap}>
                <MapPinIcon />
              </div>
              <div className={styles.contactTileTextWrap}>
                <span className={styles.contactTileLabel}>Location</span>
                <span className={styles.contactTileValue}>{location}</span>
              </div>
            </div>
          )}

          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactTile}
              title="Visit Website / Portfolio"
            >
              <div className={styles.contactTileIconWrap}>
                {isGitHubWebsite ? <GitHubIcon /> : <GlobeIcon />}
              </div>
              <div className={styles.contactTileTextWrap}>
                <span className={styles.contactTileLabel}>{isGitHubWebsite ? 'GitHub' : 'Website'}</span>
                <span className={styles.contactTileValue}>{websiteLabel}</span>
              </div>
            </a>
          )}

          {customFields.map((cf, idx) => {
            const fieldText = (cf.text as string) || (cf.value as string) || (cf.name as string) || '';
            const fieldName = (cf.name as string) || '';
            const fieldValue = (cf.value as string) || (cf.text as string) || fieldText;
            const fieldLink = formatHref(cf.link || cf.url);
            const fieldIconName = (cf.icon as string) || '';

            if (!fieldText && !fieldValue && !fieldName) return null;
            const iconElement = getCustomFieldIcon(fieldIconName, fieldText, fieldLink);
            const displayLabel = fieldName || (cf.icon as string) || 'Profile Detail';

            if (fieldLink) {
              return (
                <a
                  key={(cf.id as string) || `cf-${idx}`}
                  href={fieldLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactTile}
                  title={`${displayLabel}: ${fieldValue}`}
                >
                  <div className={styles.contactTileIconWrap}>
                    {iconElement}
                  </div>
                  <div className={styles.contactTileTextWrap}>
                    <span className={styles.contactTileLabel}>{displayLabel}</span>
                    <span className={styles.contactTileValue}>{fieldValue}</span>
                  </div>
                </a>
              );
            }

            return (
              <div
                key={(cf.id as string) || `cf-${idx}`}
                className={styles.contactTile}
                title={`${displayLabel}: ${fieldValue}`}
              >
                <div className={styles.contactTileIconWrap}>
                  {iconElement}
                </div>
                <div className={styles.contactTileTextWrap}>
                  <span className={styles.contactTileLabel}>{displayLabel}</span>
                  <span className={styles.contactTileValue}>{fieldValue}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action CTAs */}
      <div className={styles.aboutActionsRow}>
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
            <span>Portfolio & Case Studies</span>
          </Link>
        )}
      </div>

      {!onOpenQR && (
        <QRShareModal
          url={currentUrl}
          name={name}
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
};
