'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function AdminProfilesPage() {
  return (
    <div className={styles.dashboardRoot}>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Profiles & Stealth Links</h2>
          <p className={styles.welcomeSubtitle}>
            Configure tailored profile URLs (`/p/[hash]`), section visibility overrides, and target audience restrictions.
          </p>
        </div>
        <div className={styles.bannerMeta}>
          <div className={styles.bannerPill}>
            <span className={styles.pulseDot} />
            <span>Phase 5 Checkpoint</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h4 className={styles.emptyTitle}>Stealth Profile Builder (Phase 5)</h4>
          <p className={styles.emptySubtitle}>
            The interactive profile section selector, item filters, and stealth URL generator will be connected in Phase 5.
          </p>
          <Link href="/admin" className={styles.headerButton} style={{ marginTop: '0.5rem' }}>
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
