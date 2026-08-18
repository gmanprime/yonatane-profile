'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function AdminPortfolioPage() {
  return (
    <div className={styles.dashboardRoot}>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Portfolio Articles & Blog CMS</h2>
          <p className={styles.welcomeSubtitle}>
            Draft and publish deep-dive technical articles, project case studies, and engineering breakdowns with Markdown & image support.
          </p>
        </div>
        <div className={styles.bannerMeta}>
          <div className={styles.bannerPill}>
            <span className={styles.pulseDot} />
            <span>Phase 6 Checkpoint</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h4 className={styles.emptyTitle}>Portfolio Article Editor (Phase 6)</h4>
          <p className={styles.emptySubtitle}>
            The full-featured markdown editor, live rendering preview, image upload integration, and project linking will be built in Phase 6.
          </p>
          <Link href="/admin" className={styles.headerButton} style={{ marginTop: '0.5rem' }}>
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
