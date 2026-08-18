'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function AdminContentPage() {
  return (
    <div className={styles.dashboardRoot}>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Content Datasets & Resume Management</h2>
          <p className={styles.welcomeSubtitle}>
            Manage multiple resume datasets, import RxResume / JSON Resume, and configure polymorphic resume sections.
          </p>
        </div>
        <div className={styles.bannerMeta}>
          <div className={styles.bannerPill}>
            <span className={styles.pulseDot} />
            <span>Phase 4 Checkpoint</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h4 className={styles.emptyTitle}>Content Management Suite (Phase 4)</h4>
          <p className={styles.emptySubtitle}>
            The RxResume import parser, dynamic section editors, and polymorphic content organizers will be configured in Phase 4.
          </p>
          <Link href="/admin" className={styles.headerButton} style={{ marginTop: '0.5rem' }}>
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
