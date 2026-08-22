'use client';

import React, { useRef, useEffect, useState } from 'react';
import { type NavSection } from './SectionNav';
import { useScrollSpy } from '@/lib/hooks/useScrollSpy';
import styles from './client.module.css';

interface MobileNavDockProps {
  sections: NavSection[];
  onOpenQR?: () => void;
  onDownloadResume?: () => void;
}

// Compact SVG Section Icons for Dock
function getDockSectionIcon(type: string) {
  const normType = type.toLowerCase();
  switch (normType) {
    case 'about':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'experience':
    case 'work':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'education':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case 'skills':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'projects':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'profiles':
    case 'social':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case 'certifications':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'awards':
    case 'honors':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'languages':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'publications':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'volunteer':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

export const MobileNavDock: React.FC<MobileNavDockProps> = ({
  sections,
  onOpenQR,
  onDownloadResume,
}) => {
  const sectionIds = sections.map((s) => s.id);
  const activeSectionId = useScrollSpy(sectionIds, { offset: 140 });
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const activePillRef = useRef<HTMLButtonElement | null>(null);
  const scrollRailRef = useRef<HTMLDivElement | null>(null);

  // Monitor scroll depth for back-to-top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledDown(window.scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll active pill into view within horizontal rail
  useEffect(() => {
    if (activePillRef.current && scrollRailRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSectionId]);

  if (sections.length === 0) return null;

  const scrollToSection = (sectionId: string, type: string) => {
    const el = document.getElementById(sectionId) || document.getElementById(`section-${type}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    if (onDownloadResume) {
      onDownloadResume();
    } else {
      window.print();
    }
  };

  return (
    <div
      className={`${styles.mobileNavDockWrapper} ${isScrolledDown ? styles.mobileNavDockVisible : ''}`}
      role="navigation"
      aria-label="Mobile quick jump navigation dock"
    >
      {/* Horizontal Scrollable Section Pills */}
      <div className={styles.mobileDockScrollRail} ref={scrollRailRef}>
        {sections.map((sec) => {
          const isActive = activeSectionId === sec.id;
          return (
            <button
              key={sec.id}
              ref={isActive ? activePillRef : null}
              type="button"
              onClick={() => scrollToSection(sec.id, sec.type)}
              className={`${styles.mobileDockPill} ${isActive ? styles.mobileDockPillActive : ''}`}
              title={`Jump to ${sec.title}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className={styles.mobileDockPillIcon}>
                {getDockSectionIcon(sec.type)}
              </span>
              <span className={styles.mobileDockPillLabel}>{sec.title}</span>
            </button>
          );
        })}
      </div>

      {/* Dock Divider */}
      <div className={styles.mobileDockDivider} aria-hidden="true" />

      {/* Quick Action Triggers */}
      <div className={styles.mobileDockActions}>
        {onOpenQR && (
          <button
            type="button"
            onClick={onOpenQR}
            className={styles.mobileDockActionBtn}
            title="Share profile & QR code"
            aria-label="Share profile & QR code"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={handlePrint}
          className={styles.mobileDockActionBtn}
          title="Download resume PDF"
          aria-label="Download resume PDF"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {isScrolledDown && (
          <button
            type="button"
            onClick={scrollToTop}
            className={`${styles.mobileDockActionBtn} ${styles.mobileDockActionBtnTop}`}
            title="Back to top"
            aria-label="Back to top"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
