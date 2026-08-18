'use client';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './analytics.module.css';

interface TelemetryVisit {
  id: number;
  profileId: string;
  profileName?: string | null;
  profileHash?: string | null;
  ipAddress?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
  screenWidth?: number | null;
  screenHeight?: number | null;
  userAgent?: string | null;
  visitedAt: string;
}

interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  devices: { deviceType: string; count: number }[];
  browsers: { browser: string; count: number }[];
  operatingSystems: { os: string; count: number }[];
  countries: { country: string; count: number }[];
  referrers: { referrer: string; count: number }[];
  timeline: { date: string; count: number }[];
  recentVisits: TelemetryVisit[];
  profiles: { id: string; name: string; hash: string; isDefault: boolean }[];
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [maskIps, setMaskIps] = useState(true);
  const [selectedLog, setSelectedLog] = useState<TelemetryVisit | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVisits: 0,
    uniqueVisitors: 0,
    devices: [],
    browsers: [],
    operatingSystems: [],
    countries: [],
    referrers: [],
    timeline: [],
    recentVisits: [],
    profiles: [],
  });

  // Calculate start & end date strings based on timeRange
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (timeRange === '24h') {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (timeRange === '7d') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (timeRange === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (timeRange === '90d') {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: d.toISOString(), endDate: now.toISOString() };
    }
    if (timeRange === 'custom') {
      return {
        startDate: customStart ? new Date(customStart).toISOString() : undefined,
        endDate: customEnd ? new Date(customEnd).toISOString() : undefined,
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [timeRange, customStart, customEnd]);

  // Load telemetry data
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (selectedProfileId) params.append('profileId', selectedProfileId);
        if (dateBounds.startDate) params.append('startDate', dateBounds.startDate);
        if (dateBounds.endDate) params.append('endDate', dateBounds.endDate);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        params.append('limit', '250');

        const res = await fetch(`/api/v1/analytics?${params.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.analytics) {
            setAnalytics(data.analytics);
          }
        }
      } catch (err) {
        console.error('Failed to load telemetry analytics:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [selectedProfileId, dateBounds, searchQuery]);

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (selectedProfileId) params.append('profileId', selectedProfileId);
      if (dateBounds.startDate) params.append('startDate', dateBounds.startDate);
      if (dateBounds.endDate) params.append('endDate', dateBounds.endDate);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', '250');

      const res = await fetch(`/api/v1/analytics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.analytics) {
          setAnalytics(data.analytics);
        }
      }
    } catch (err) {
      console.error('Failed to refresh analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Trigger CSV Export Download
  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (selectedProfileId) params.append('profileId', selectedProfileId);
    if (dateBounds.startDate) params.append('startDate', dateBounds.startDate);
    if (dateBounds.endDate) params.append('endDate', dateBounds.endDate);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    const exportUrl = `/api/v1/analytics/export?${params.toString()}`;
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `stealth-telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format masked IP
  const formatIp = (ip?: string | null) => {
    if (!ip) return '—';
    if (!maskIps) return ip;
    return ip.replace(/(\d+)\.(\d+)\..*/, '$1.$2.***.***');
  };

  // Max count for timeline scaling
  const maxTimelineCount = useMemo(() => {
    if (analytics.timeline.length === 0) return 1;
    return Math.max(...analytics.timeline.map((t) => t.count), 1);
  }, [analytics.timeline]);

  // Derived Top metrics
  const topCountry = analytics.countries.length > 0 ? analytics.countries[0].country : 'Global';
  const topDevice = analytics.devices.length > 0 ? analytics.devices[0].deviceType : 'Desktop';
  const topReferrer = analytics.referrers.length > 0 ? analytics.referrers[0].referrer : 'Direct';

  return (
    <div className={styles.analyticsRoot}>
      {/* Header Banner */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Visitor Telemetry & Access Intelligence
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem', maxWidth: '680px', lineHeight: 1.5 }}>
            Real-time access logs, audience geographic breakdown, client device telemetry, and stealth hash conversion analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleManualRefresh} className={styles.secondaryBtn} title="Refresh telemetry data">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button onClick={handleExportCSV} className={styles.primaryBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* FILTER CONTROLS BAR */}
      <section className={styles.filterBarCard}>
        <div className={styles.filterRowMain}>
          {/* Time Range Selector */}
          <div className={styles.datePillsGroup}>
            {(['24h', '7d', '30d', '90d', 'all', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`${styles.datePill} ${timeRange === r ? styles.datePillActive : ''}`}
              >
                {r === '24h' ? 'Last 24 Hours' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : r === 'all' ? 'All Time' : 'Custom'}
              </button>
            ))}
          </div>

          <div className={styles.filterControlsRight}>
            {/* Profile Dropdown Filter */}
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className={styles.profileSelect}
            >
              <option value="">All Stealth Profiles</option>
              {analytics.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (/p/{p.hash}) {p.isDefault ? '⭐' : ''}
                </option>
              ))}
            </select>

            {/* Keyword Search */}
            <div className={styles.searchFieldWrapper}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Filter by IP, City, Browser..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {timeRange === 'custom' && (
          <div className={styles.customDateRow}>
            <span>Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={styles.dateInput}
            />
            <span>End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        )}
      </section>

      {/* KPI METRIC CARDS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Stealth Views</span>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconBlue}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>{loading ? '—' : analytics.totalVisits}</div>
          <div className={styles.kpiSubtext}>
            <span>Total recorded hits</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Unique Visitors</span>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconEmerald}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>{loading ? '—' : analytics.uniqueVisitors}</div>
          <div className={styles.kpiSubtext}>
            <span>Distinct client IPs</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Top Geographic Origin</span>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconPurple}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ fontSize: '1.4rem' }}>{loading ? '—' : topCountry}</div>
          <div className={styles.kpiSubtext}>
            <span>Primary traffic source</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Primary Device</span>
            <div className={`${styles.kpiIconBox} ${styles.kpiIconAmber}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ fontSize: '1.4rem', textTransform: 'capitalize' }}>
            {loading ? '—' : topDevice}
          </div>
          <div className={styles.kpiSubtext}>
            <span>Dominant form factor ({topReferrer} top source)</span>
          </div>
        </div>
      </section>

      {/* VISUAL BREAKDOWN CHARTS */}
      <section className={styles.visualGrid}>
        {/* Timeline Activity Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h4 className={styles.chartCardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Daily Traffic Trend</span>
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hits per day</span>
          </div>

          {analytics.timeline.length > 0 ? (
            <div className={styles.timelineHistogram}>
              {analytics.timeline.map((item) => {
                const heightPercent = Math.max((item.count / maxTimelineCount) * 100, 8);
                return (
                  <div key={item.date} className={styles.histogramBarCol} title={`${item.date}: ${item.count} visits`}>
                    <div
                      className={styles.histogramBar}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className={styles.histogramDateLabel}>
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
              No timeline hits recorded in selected timeframe.
            </div>
          )}
        </div>

        {/* Device & Client Ratio */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h4 className={styles.chartCardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Device Distribution</span>
            </h4>
          </div>

          <div className={styles.distList}>
            {analytics.devices.length > 0 ? (
              analytics.devices.map((d) => {
                const pct = analytics.totalVisits > 0 ? Math.round((d.count / analytics.totalVisits) * 100) : 0;
                return (
                  <div key={d.deviceType} className={styles.distItem}>
                    <div className={styles.distItemHeader}>
                      <span className={styles.distItemName} style={{ textTransform: 'capitalize' }}>
                        {d.deviceType}
                      </span>
                      <span className={styles.distItemCount}>{d.count} ({pct}%)</span>
                    </div>
                    <div className={styles.distTrack}>
                      <div className={`${styles.distFill} ${styles.distFillEmerald}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No device telemetry.
              </div>
            )}
          </div>
        </div>

        {/* Geographic Breakdown */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h4 className={styles.chartCardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
              <span>Geographic Distribution</span>
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Top countries</span>
          </div>

          <div className={styles.distList}>
            {analytics.countries.length > 0 ? (
              analytics.countries.map((c) => {
                const pct = analytics.totalVisits > 0 ? Math.round((c.count / analytics.totalVisits) * 100) : 0;
                return (
                  <div key={c.country} className={styles.distItem}>
                    <div className={styles.distItemHeader}>
                      <span className={styles.distItemName}>
                        <span>🌍</span>
                        <span>{c.country}</span>
                      </span>
                      <span className={styles.distItemCount}>{c.count} ({pct}%)</span>
                    </div>
                    <div className={styles.distTrack}>
                      <div className={styles.distFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No geo-location records yet.
              </div>
            )}
          </div>
        </div>

        {/* Top Referrers & Channels */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <h4 className={styles.chartCardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Top Referrers</span>
            </h4>
          </div>

          <div className={styles.distList}>
            {analytics.referrers.length > 0 ? (
              analytics.referrers.map((r) => {
                const pct = analytics.totalVisits > 0 ? Math.round((r.count / analytics.totalVisits) * 100) : 0;
                return (
                  <div key={r.referrer} className={styles.distItem}>
                    <div className={styles.distItemHeader}>
                      <span className={styles.distItemName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {r.referrer}
                      </span>
                      <span className={styles.distItemCount}>{r.count}</span>
                    </div>
                    <div className={styles.distTrack}>
                      <div className={`${styles.distFill} ${styles.distFillPurple}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No referrer telemetry recorded.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DETAILED TELEMETRY ACCESS LOGS TABLE */}
      <section className={styles.tableContainer}>
        <div className={styles.tableHeaderBar}>
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Access Telemetry Stream</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
              {analytics.recentVisits.length} events matching
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setMaskIps(!maskIps)}
              className={styles.secondaryBtn}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              {maskIps ? '👁️ Unmask IPs' : '🔒 Mask IPs'}
            </button>
          </div>
        </div>

        {analytics.recentVisits.length > 0 ? (
          <div className={styles.tableScrollArea}>
            <table className={styles.telemetryTable}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Profile Target</th>
                  <th>Location</th>
                  <th>Client / OS</th>
                  <th>Referrer</th>
                  <th>IP Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentVisits.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>
                        {new Date(item.visitedAt).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        {new Date(item.visitedAt).toLocaleTimeString()}
                      </div>
                    </td>

                    <td>
                      <span className={styles.profileSlugBadge}>
                        /p/{item.profileHash || 'default'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>📍</span>
                        <span>{item.city ? `${item.city}, ${item.country}` : item.country || 'Global'}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span className={styles.devicePill}>
                          {item.deviceType || 'desktop'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {item.browser || 'Browser'} on {item.os || 'OS'}
                        </span>
                      </div>
                    </td>

                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.referrer || 'Direct / Bookmark'}
                    </td>

                    <td className={styles.ipCell} onClick={() => navigator.clipboard.writeText(item.ipAddress || '')} title="Click to copy IP">
                      {formatIp(item.ipAddress)}
                    </td>

                    <td>
                      <button
                        onClick={() => setSelectedLog(item)}
                        className={styles.secondaryBtn}
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#94a3b8' }}>
            <svg style={{ margin: '0 auto 0.75rem', color: '#64748b' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <h4 style={{ color: '#ffffff', fontSize: '1.05rem', margin: 0 }}>No Telemetry Events Recorded</h4>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.35rem' }}>
              Traffic to root or stealth links (<code style={{ color: '#60a5fa' }}>/p/[hash]</code>) will log automatically.
            </p>
          </div>
        )}
      </section>

      {/* INSPECT LOG MODAL */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#0d1322',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Telemetry Event Inspector
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Target Profile</div>
                <div style={{ color: '#60a5fa', fontWeight: 700, marginTop: '0.2rem' }}>/p/{selectedLog.profileHash || 'default'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Visited At</div>
                <div style={{ color: '#ffffff', marginTop: '0.2rem' }}>{new Date(selectedLog.visitedAt).toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>IP Address</div>
                <div style={{ color: '#ffffff', fontFamily: 'monospace', marginTop: '0.2rem' }}>{selectedLog.ipAddress || '—'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Location</div>
                <div style={{ color: '#ffffff', marginTop: '0.2rem' }}>{selectedLog.city ? `${selectedLog.city}, ${selectedLog.country}` : selectedLog.country || 'Unknown'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Device & Client</div>
                <div style={{ color: '#ffffff', marginTop: '0.2rem' }}>{selectedLog.deviceType} • {selectedLog.browser} / {selectedLog.os}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Screen Resolution</div>
                <div style={{ color: '#ffffff', marginTop: '0.2rem' }}>{selectedLog.screenWidth && selectedLog.screenHeight ? `${selectedLog.screenWidth} x ${selectedLog.screenHeight}` : '—'}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Raw User Agent</div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {selectedLog.userAgent || 'No user agent provided'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedLog(null)} className={styles.primaryBtn}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
