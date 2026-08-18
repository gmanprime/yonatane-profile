'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface ProfileItem {
  id: string;
  name: string;
  description: string | null;
  hash: string;
  isDefault: boolean;
  contentDatasetId: string | null;
  datasetName?: string;
  visitsCount?: number;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  profileName: string;
  profileHash: string;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  visitedAt: string;
}

interface DashboardMetrics {
  totalProfiles: number;
  totalDatasets: number;
  totalPortfolioItems: number;
  totalVisits: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProfiles: 0,
    totalDatasets: 0,
    totalPortfolioItems: 0,
    totalVisits: 0,
  });

  const [profilesList, setProfilesList] = useState<ProfileItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // Fetch parallel endpoints
        const [profilesRes, contentRes, portfolioRes, analyticsRes] = await Promise.allSettled([
          fetch('/api/v1/profiles').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/v1/content').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/v1/portfolio').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/v1/analytics').then((r) => (r.ok ? r.json() : null)),
        ]);

        const profilesData = profilesRes.status === 'fulfilled' ? profilesRes.value : null;
        const contentData = contentRes.status === 'fulfilled' ? contentRes.value : null;
        const portfolioData = portfolioRes.status === 'fulfilled' ? portfolioRes.value : null;
        const analyticsData = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;

        const profiles = profilesData?.profiles || [];
        const datasets = contentData?.datasets || [];
        const portfolioItems = portfolioData?.items || [];
        const overallAnalytics = analyticsData?.analytics || { totalVisits: 0, recentVisits: [] };

        // Map datasets name onto profiles
        const datasetMap = new Map<string, string>();
        datasets.forEach((d: { id: string; name: string }) => {
          datasetMap.set(d.id, d.name);
        });

        const enhancedProfiles: ProfileItem[] = profiles.map((p: ProfileItem) => ({
          ...p,
          datasetName: p.contentDatasetId ? datasetMap.get(p.contentDatasetId) || 'Linked Resume' : 'Default Dataset',
          visitsCount: 0,
        }));

        setProfilesList(enhancedProfiles);
        setRecentActivities(
          (overallAnalytics.recentVisits || []).map((v: {
            id: string;
            profileName?: string;
            profileHash?: string;
            country?: string | null;
            city?: string | null;
            deviceType?: string | null;
            browser?: string | null;
            os?: string | null;
            visitedAt: string;
          }) => ({
            id: v.id,
            profileName: v.profileName || 'Stealth Profile',
            profileHash: v.profileHash || 'default',
            country: v.country || 'Global',
            city: v.city || 'Visitor',
            deviceType: v.deviceType || 'desktop',
            browser: v.browser || 'Browser',
            os: v.os || 'OS',
            visitedAt: v.visitedAt,
          }))
        );

        setMetrics({
          totalProfiles: profiles.length,
          totalDatasets: datasets.length,
          totalPortfolioItems: portfolioItems.length,
          totalVisits: overallAnalytics.totalVisits || 0,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const handleCopyLink = (hash: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yonatanelias.dpdns.org';
    const link = `${origin}/p/${hash}`;
    navigator.clipboard.writeText(link);
    setCopiedHash(hash);
    setTimeout(() => {
      setCopiedHash(null);
    }, 2000);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className={styles.dashboardRoot}>
      {/* Welcome Banner */}
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Welcome to Yonatan Elias Profile Portal</h2>
          <p className={styles.welcomeSubtitle}>
            Manage stealth personalized resume links, dynamic dataset sections, markdown portfolio deep-dives, and visitor telemetry.
          </p>
        </div>
        <div className={styles.bannerMeta}>
          <div className={styles.bannerPill}>
            <span className={styles.pulseDot} />
            <span>Next.js 15 App Router</span>
          </div>
          <div className={styles.bannerPill}>
            <span>Supabase PostgreSQL + Drizzle ORM</span>
          </div>
        </div>
      </section>

      {/* KPI Metric Cards */}
      <section className={styles.metricsGrid}>
        {/* Metric 1: Profiles */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Profiles</span>
            <div className={`${styles.metricIconWrapper} ${styles.metricIconBlue}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>
            {loading ? '—' : metrics.totalProfiles}
          </div>
          <div className={styles.metricSubtext}>
            <span>Stealth hash target URLs</span>
          </div>
        </div>

        {/* Metric 2: Datasets */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Active Datasets</span>
            <div className={`${styles.metricIconWrapper} ${styles.metricIconEmerald}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>
            {loading ? '—' : metrics.totalDatasets}
          </div>
          <div className={styles.metricSubtext}>
            <span>RxResume & JSON datasets</span>
          </div>
        </div>

        {/* Metric 3: Portfolio Articles */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Portfolio Articles</span>
            <div className={`${styles.metricIconWrapper} ${styles.metricIconPurple}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>
            {loading ? '—' : metrics.totalPortfolioItems}
          </div>
          <div className={styles.metricSubtext}>
            <span>Deep-dive technical write-ups</span>
          </div>
        </div>

        {/* Metric 4: Stealth Link Telemetry */}
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Stealth Link Visits</span>
            <div className={`${styles.metricIconWrapper} ${styles.metricIconAmber}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className={styles.metricValue}>
            {loading ? '—' : metrics.totalVisits}
          </div>
          <div className={styles.metricSubtext}>
            <span>Aggregated visitor telemetry</span>
          </div>
        </div>
      </section>

      {/* Quick Action Cards */}
      <section className={styles.quickActionsGrid}>
        <Link href="/admin/content" className={styles.quickActionCard}>
          <div className={styles.quickActionIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className={styles.quickActionContent}>
            <h3 className={styles.quickActionTitle}>Import New Resume</h3>
            <p className={styles.quickActionDesc}>
              Upload RxResume v4/v5 or JSON Resume to instantly create structured datasets.
            </p>
          </div>
          <div className={styles.quickActionArrow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        <Link href="/admin/profiles" className={styles.quickActionCard}>
          <div className={styles.quickActionIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div className={styles.quickActionContent}>
            <h3 className={styles.quickActionTitle}>Create Stealth Profile Link</h3>
            <p className={styles.quickActionDesc}>
              Generate a collision-resistant 8-character hash URL tailored for recruiters.
            </p>
          </div>
          <div className={styles.quickActionArrow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        <Link href="/admin/portfolio" className={styles.quickActionCard}>
          <div className={styles.quickActionIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div className={styles.quickActionContent}>
            <h3 className={styles.quickActionTitle}>Write Blog Entry</h3>
            <p className={styles.quickActionDesc}>
              Publish a rich Markdown project write-up or technical article.
            </p>
          </div>
          <div className={styles.quickActionArrow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      </section>

      {/* Active Profiles Table */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span>Active Stealth Profiles</span>
            <span className={styles.sectionTitleBadge}>{profilesList.length} total</span>
          </div>
          <Link href="/admin/profiles" className={styles.headerButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Profile</span>
          </Link>
        </div>

        {profilesList.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Profile Name</th>
                  <th>Stealth URL (`/p/[hash]`)</th>
                  <th>Linked Dataset</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profilesList.map((profile) => (
                  <tr key={profile.id}>
                    <td>
                      <div className={styles.profileNameCell}>
                        <span className={styles.profileTitle}>{profile.name}</span>
                        {profile.description && (
                          <span className={styles.profileDesc}>{profile.description}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.stealthHashGroup}>
                        <span>/p/{profile.hash}</span>
                        <button
                          type="button"
                          className={`${styles.copyButton} ${copiedHash === profile.hash ? styles.copySuccess : ''}`}
                          onClick={() => handleCopyLink(profile.hash)}
                          title="Copy Full Stealth URL to Clipboard"
                          aria-label="Copy Stealth Link"
                        >
                          {copiedHash === profile.hash ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span>{profile.datasetName}</span>
                    </td>
                    <td>
                      {profile.isDefault ? (
                        <span className={styles.badgeDefault}>Default</span>
                      ) : (
                        <span className={styles.badgeCustom}>Custom Stealth</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.tableActions} style={{ justifyContent: 'flex-end' }}>
                        <Link
                          href={`/p/${profile.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.actionIconBtn}
                          title="Open Stealth Link in New Tab"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </Link>
                        <Link
                          href={`/admin/profiles/${profile.id}`}
                          className={styles.actionIconBtn}
                          title="Edit Profile Settings & Overrides"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/admin/analytics?profileId=${profile.id}`}
                          className={styles.actionIconBtn}
                          title="View Profile Telemetry"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </Link>
                      </div>
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
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <h4 className={styles.emptyTitle}>No Stealth Profiles Configured</h4>
            <p className={styles.emptySubtitle}>
              Create your first profile link to share tailored versions of your resume with specific companies or roles.
            </p>
            <Link href="/admin/profiles" className={styles.headerButton} style={{ marginTop: '0.5rem' }}>
              Create Profile Link
            </Link>
          </div>
        )}
      </section>

      {/* Recent Analytics Activity Preview */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span>Recent Visitor Telemetry</span>
            <span className={styles.sectionTitleBadge}>Real-time</span>
          </div>
          <Link href="/admin/analytics" className={styles.publicViewButton} style={{ fontSize: '0.8rem' }}>
            <span>Full Analytics Report</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {recentActivities.length > 0 ? (
          <div className={styles.activityList}>
            {recentActivities.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityLeft}>
                  <div className={styles.activityIcon}>
                    {activity.deviceType === 'mobile' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.activityDetails}>
                    <div className={styles.activityTitle}>
                      <span>{activity.city ? `${activity.city}, ${activity.country}` : activity.country || 'Global Visitor'}</span>
                      <span className={styles.activityProfileBadge}>/p/{activity.profileHash}</span>
                    </div>
                    <div className={styles.activityMeta}>
                      <span>{activity.browser} on {activity.os}</span>
                      <span>•</span>
                      <span>{activity.profileName}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.activityRight}>
                  <span className={styles.activityTime}>{formatTimeAgo(activity.visitedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h4 className={styles.emptyTitle}>No Visitor Telemetry Recorded Yet</h4>
            <p className={styles.emptySubtitle}>
              When recruiters visit your `/p/[hash]` stealth links, their device type, browser, region, and engagement telemetry will automatically stream here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
