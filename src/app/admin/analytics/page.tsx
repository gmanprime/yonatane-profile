'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    totalVisits: number;
    uniqueVisitors: number;
    recentVisits: Array<{
      id: string;
      profileName?: string;
      profileHash?: string;
      country?: string | null;
      city?: string | null;
      deviceType?: string | null;
      browser?: string | null;
      os?: string | null;
      visitedAt: string;
      ipAddress?: string | null;
    }>;
  }>({ totalVisits: 0, uniqueVisitors: 0, recentVisits: [] });

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/analytics');
        if (res.ok) {
          const data = await res.json();
          if (data.analytics) {
            setAnalytics(data.analytics);
          }
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  return (
    <div className={styles.dashboardRoot}>
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Visitor Telemetry & Analytics</h2>
          <p className={styles.welcomeSubtitle}>
            Live insights, geo-location mapping, device/browser distribution, and stealth link engagement tracking.
          </p>
        </div>
        <div className={styles.bannerMeta}>
          <div className={styles.bannerPill}>
            <span className={styles.pulseDot} />
            <span>Telemetry Active</span>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Stealth Hits</span>
            <div className={`${styles.metricIconWrapper} ${styles.metricIconBlue}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>{loading ? '—' : analytics.totalVisits}</div>
          <div className={styles.metricSubtext}><span>Total pageviews</span></div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Unique Visitors</span>
            <div className={`${styles.metricIconWrapper} ${styles.metricIconEmerald}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>{loading ? '—' : analytics.uniqueVisitors}</div>
          <div className={styles.metricSubtext}><span>Unique client IPs</span></div>
        </div>
      </section>

      {/* Telemetry Logs Table */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span>Recent Access Logs</span>
            <span className={styles.sectionTitleBadge}>{analytics.recentVisits.length} events</span>
          </div>
          <Link href="/admin" className={styles.headerButton}>
            <span>Back to Overview</span>
          </Link>
        </div>

        {analytics.recentVisits.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Location</th>
                  <th>Device / Client</th>
                  <th>Profile Target</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentVisits.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.visitedAt).toLocaleString()}</td>
                    <td>{item.city ? `${item.city}, ${item.country}` : item.country || 'Global'}</td>
                    <td>{item.deviceType || 'desktop'} • {item.browser || 'Browser'} / {item.os || 'OS'}</td>
                    <td>
                      <span className={styles.activityProfileBadge}>
                        /p/{item.profileHash || 'default'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b' }}>
                      {item.ipAddress ? item.ipAddress.replace(/(\d+)\.(\d+)\..*/, '$1.$2.***.***') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h4 className={styles.emptyTitle}>No Telemetry Recorded</h4>
            <p className={styles.emptySubtitle}>
              Access telemetry will be recorded automatically when stealth links (`/p/[hash]`) or root routes are visited.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
