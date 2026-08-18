'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function AdminThemesPage() {
  return (
    <div className={styles.dashboardRoot}>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Theme Customizer & Layout Settings</h2>
          <p className={styles.welcomeSubtitle}>
            Configure typography, color palettes, spacing density, and glassmorphism presets.
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
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
          <h4 className={styles.emptyTitle}>Theme Customizer</h4>
          <p className={styles.emptySubtitle}>
            Custom layout styling presets, dark/light variants, and CSS token configurations.
          </p>
          <Link href="/admin" className={styles.headerButton} style={{ marginTop: '0.5rem' }}>
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
