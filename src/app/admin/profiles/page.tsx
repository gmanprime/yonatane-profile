'use client';

import React, { useState, useEffect, useMemo, useId, useCallback } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import styles from './profiles.module.css';

interface ProfileItem {
  id: string;
  name: string;
  description: string | null;
  hash: string;
  isDefault: boolean;
  contentDatasetId: string | null;
  themeId: string | null;
  createdAt: string;
  updatedAt: string;
  contentDataset?: {
    id: string;
    name: string;
  } | null;
  theme?: {
    id: string;
    name: string;
  } | null;
  profileSections?: Array<{
    id: string;
    sectionId: string;
    visible: boolean;
    selectedItemIds?: string[];
  }>;
}

interface DatasetOption {
  id: string;
  name: string;
  sectionCount: number;
  itemCount: number;
}

interface ThemeOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface PreviewItem {
  id: string;
  data: Record<string, unknown>;
  displayOrder?: number;
}

interface PreviewSection {
  id: string;
  type: string;
  title: string;
  icon?: string;
  columns?: number;
  items: PreviewItem[];
}

interface PreviewData {
  basics?: {
    name?: string;
    headline?: string;
    email?: string;
    location?: string;
  };
  summary?: string;
  sections?: PreviewSection[];
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Create Profile Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    hash: '',
    contentDatasetId: '',
    themeId: '',
    isDefault: false,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // QR Modal State
  const [qrModalProfile, setQrModalProfile] = useState<ProfileItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');

  // Preview Modal State
  const [previewProfile, setPreviewProfile] = useState<ProfileItem | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Action status toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const makeDefaultSwitchId = useId();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [pRes, dRes, tRes] = await Promise.all([
        fetch('/api/v1/profiles'),
        fetch('/api/v1/content'),
        fetch('/api/v1/themes'),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        setProfiles(pData.profiles || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDatasets(dData.datasets || []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setThemes(tData.themes || []);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [pRes, dRes, tRes] = await Promise.all([
          fetch('/api/v1/profiles'),
          fetch('/api/v1/content'),
          fetch('/api/v1/themes'),
        ]);

        if (!isMounted) return;

        if (pRes.ok) {
          const pData = await pRes.json();
          setProfiles(pData.profiles || []);
        }
        if (dRes.ok) {
          const dData = await dRes.json();
          setDatasets(dData.datasets || []);
        }
        if (tRes.ok) {
          const tData = await tRes.json();
          setThemes(tData.themes || []);
        }
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter profiles based on search
  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.hash.toLowerCase().includes(q) ||
        (p.contentDataset && p.contentDataset.name.toLowerCase().includes(q))
    );
  }, [profiles, searchQuery]);

  // Handle unique hash generation
  const handleGenerateHash = async () => {
    try {
      const res = await fetch('/api/v1/profiles/generate-hash');
      if (res.ok) {
        const data = await res.json();
        setCreateForm((prev) => ({ ...prev, hash: data.hash }));
      }
    } catch (err) {
      console.error('Failed to generate hash:', err);
    }
  };

  // Open Create Profile Modal
  const openCreateModal = async () => {
    await handleGenerateHash();
    setCreateForm((prev) => ({
      ...prev,
      name: '',
      description: '',
      contentDatasetId: datasets.length > 0 ? datasets[0].id : '',
      themeId: themes.length > 0 ? themes[0].id : '',
      isDefault: profiles.length === 0,
    }));
    setCreateError(null);
    setShowCreateModal(true);
  };

  // Submit New Profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Profile name is required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        hash: createForm.hash.trim() || undefined,
        contentDatasetId: createForm.contentDatasetId || undefined,
        themeId: createForm.themeId || undefined,
        isDefault: createForm.isDefault,
      };

      const res = await fetch('/api/v1/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create profile');
      }

      setShowCreateModal(false);
      await loadData();
      showToast('Profile created successfully!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error creating profile';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Set Profile as Primary Default
  const handleSetPrimary = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/v1/profiles/${id}/activate`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to set primary profile');
      }

      await loadData();
      showToast(`"${name}" is now the primary stealth profile!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error activating profile';
      alert(msg);
    }
  };

  // Delete Profile
  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete profile "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/profiles/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete profile');
      }

      await loadData();
      showToast(`Profile "${name}" deleted.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error deleting profile';
      alert(msg);
    }
  };

  // Copy Stealth Link
  const copyStealthLink = (hash: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yonatanelias.dpdns.org';
    const url = `${origin}/p/${hash}`;
    navigator.clipboard.writeText(url);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    showToast('Stealth link copied to clipboard!');
  };

  // Open QR Code Modal
  const openQrModal = async (profile: ProfileItem) => {
    setQrModalProfile(profile);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yonatanelias.dpdns.org';
    const targetUrl = `${origin}/p/${profile.hash}`;

    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);

      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
      });
      setQrSvgString(svg);
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  };

  // Download QR Code PNG
  const downloadQrPng = () => {
    if (!qrDataUrl || !qrModalProfile) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `stealth-qr-${qrModalProfile.hash}.png`;
    a.click();
  };

  // Download QR Code SVG
  const downloadQrSvg = () => {
    if (!qrSvgString || !qrModalProfile) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stealth-qr-${qrModalProfile.hash}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open Preview Modal
  const openPreviewModal = async (profile: ProfileItem) => {
    setPreviewProfile(profile);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/v1/public/${profile.hash}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.profile);
      }
    } catch (err) {
      console.error('Error loading preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const defaultProfile = profiles.find((p) => p.isDefault);

  return (
    <div className={styles.profilesRoot}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#93c5fd',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Profile Composition & Stealth Studio
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem', maxWidth: '650px', lineHeight: 1.5 }}>
            Create tailored stealth URLs (<code style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>/p/[hash]</code>), cherry-pick specific sections & accomplishments, and share direct stealth links with QR intelligence.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={openCreateModal} className={styles.primaryBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Stealth Profile</span>
          </button>
        </div>
      </section>

      {/* Overview Metric Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>Total Stealth Profiles</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>{loading ? '—' : profiles.length}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Distinct audience targets</span>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 700, letterSpacing: '0.04em' }}>Primary Public Profile</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loading ? '—' : defaultProfile ? defaultProfile.name : 'None assigned'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {defaultProfile ? `/p/${defaultProfile.hash}` : 'Set a default profile'}
          </span>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.15rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>Datasets Available</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>{loading ? '—' : datasets.length}</div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Source CV documents</span>
        </div>
      </section>

      {/* Search & Actions Bar */}
      <section className={styles.actionBar}>
        <div className={styles.searchContainer}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search profiles by name, hash, dataset..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.actionButtons}>
          <Link href="/admin/content" className={styles.secondaryBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Manage Datasets</span>
          </Link>
          <Link href="/admin/analytics" className={styles.secondaryBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>View Telemetry</span>
          </Link>
        </div>
      </section>

      {/* Profiles Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>Loading stealth profiles...</p>
        </div>
      ) : filteredProfiles.length > 0 ? (
        <section className={styles.profilesGrid}>
          {filteredProfiles.map((profile) => {
            const isCopied = copiedHash === profile.hash;
            const sectionsCount = profile.profileSections ? profile.profileSections.filter((s) => s.visible).length : 'All';

            return (
              <div
                key={profile.id}
                className={`${styles.profileCard} ${profile.isDefault ? styles.profileCardPrimary : ''}`}
              >
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <div className={styles.profileName}>
                      <span>{profile.name}</span>
                      {profile.isDefault && (
                        <span className={styles.defaultBadge}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Primary
                        </span>
                      )}
                    </div>
                    {profile.description ? (
                      <span className={styles.profileDesc}>{profile.description}</span>
                    ) : (
                      <span className={styles.profileDesc} style={{ fontStyle: 'italic', opacity: 0.6 }}>
                        No context notes added
                      </span>
                    )}
                  </div>
                </div>

                {/* Stealth Hash & Link Box */}
                <div className={styles.stealthLinkBox}>
                  <div className={styles.stealthHashLabel}>
                    <span className={styles.stealthHashPrefix}>/p/</span>
                    <span className={styles.stealthHashValue}>{profile.hash}</span>
                  </div>
                  <button
                    onClick={() => copyStealthLink(profile.hash)}
                    className={`${styles.copyPillBtn} ${isCopied ? styles.copyPillBtnCopied : ''}`}
                    title="Copy stealth link"
                  >
                    {isCopied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Meta Badges */}
                <div className={styles.metaTagsRow}>
                  <span className={styles.metaTag}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>{profile.contentDataset ? profile.contentDataset.name : 'Default Dataset'}</span>
                  </span>

                  <span className={styles.metaTag}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m4.93 4.93 4.24 4.24" />
                      <path d="m14.83 9.17 4.24-4.24" />
                      <path d="m14.83 14.83 4.24 4.24" />
                      <path d="m9.17 14.83-4.24 4.24" />
                    </svg>
                    <span>{profile.theme ? profile.theme.name : 'Obsidian Theme'}</span>
                  </span>

                  <span className={`${styles.metaTag} ${styles.metaTagHighlight}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <span>{sectionsCount} Sections active</span>
                  </span>
                </div>

                {/* Card Footer Actions */}
                <div className={styles.cardFooter}>
                  <Link href={`/admin/profiles/${profile.id}`} className={styles.primaryBtn} style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <span>Edit Studio</span>
                  </Link>

                  <div className={styles.footerActions}>
                    <button
                      onClick={() => openQrModal(profile)}
                      className={styles.iconBtn}
                      title="Generate QR Code"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </button>

                    <button
                      onClick={() => openPreviewModal(profile)}
                      className={styles.iconBtn}
                      title="Preview Resolved Profile"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>

                    {!profile.isDefault && (
                      <button
                        onClick={() => handleSetPrimary(profile.id, profile.name)}
                        className={styles.iconBtn}
                        title="Set as Primary Profile"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteProfile(profile.id, profile.name)}
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      title="Delete Profile"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>No Stealth Profiles Found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.4rem', maxWidth: '440px', margin: '0.4rem auto 1.5rem' }}>
            {searchQuery ? `No profiles matching "${searchQuery}".` : 'Create tailored stealth profiles with customized section visibility and 8-character unique URLs.'}
          </p>
          <button onClick={openCreateModal} className={styles.primaryBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create First Stealth Profile</span>
          </button>
        </section>
      )}

      {/* CREATE PROFILE MODAL */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => !creating && setShowCreateModal(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Create Stealth Profile</h3>
                <p className={styles.modalSubtitle}>Configure audience context, assigned dataset, theme, and 8-char stealth URL.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className={styles.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {createError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Profile Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full-Stack Lead / YC Pitch"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={styles.textInput}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Description / Target Audience (Optional)</label>
                <textarea
                  placeholder="e.g. Highlight distributed systems, Kubernetes, and high-impact metrics for enterprise roles."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className={styles.textareaInput}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  <span>Stealth Hash URL</span>
                  <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>8-char URL-safe slug</span>
                </label>
                <div className={styles.hashInputGroup}>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={createForm.hash}
                    onChange={(e) => setCreateForm({ ...createForm, hash: e.target.value })}
                    className={`${styles.textInput} ${styles.hashInput}`}
                  />
                  <button type="button" onClick={handleGenerateHash} className={styles.generateHashBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>Regenerate</span>
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Target: <code style={{ color: '#93c5fd' }}>/p/{createForm.hash || '...'}</code>
                </span>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Assigned Content Dataset</label>
                <select
                  value={createForm.contentDatasetId}
                  onChange={(e) => setCreateForm({ ...createForm, contentDatasetId: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="">-- Select Source Dataset --</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.sectionCount} sections, {d.itemCount} items)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Assigned Theme</label>
                <select
                  value={createForm.themeId}
                  onChange={(e) => setCreateForm({ ...createForm, themeId: e.target.value })}
                  className={styles.selectInput}
                >
                  <option value="">System Default (Obsidian Theme)</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.toggleRow}>
                <div className={styles.toggleLabel}>
                  <span className={styles.toggleTitle}>Set as Primary / Default Profile</span>
                  <span className={styles.toggleDesc}>Visitors hitting root or default link will view this profile.</span>
                </div>
                <label className={styles.switch} htmlFor={makeDefaultSwitchId}>
                  <input
                    id={makeDefaultSwitchId}
                    type="checkbox"
                    checked={createForm.isDefault}
                    onChange={(e) => setCreateForm({ ...createForm, isDefault: e.target.checked })}
                  />
                  <span className={styles.slider} />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className={styles.secondaryBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className={styles.primaryBtn}>
                  {creating ? 'Creating Profile...' : 'Save & Open Studio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {qrModalProfile && (
        <div className={styles.modalBackdrop} onClick={() => setQrModalProfile(null)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Stealth QR Code</h3>
                <p className={styles.modalSubtitle}>High-contrast scannable link for &quot;{qrModalProfile.name}&quot;</p>
              </div>
              <button onClick={() => setQrModalProfile(null)} className={styles.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.qrContainer}>
              <div className={styles.qrCanvasWrapper}>
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR for ${qrModalProfile.name}`} width={240} height={240} style={{ display: 'block' }} />
                ) : (
                  <div style={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    Generating QR...
                  </div>
                )}
              </div>

              <div className={styles.qrLinkPill}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>/p/{qrModalProfile.hash}</span>
              </div>

              <div className={styles.qrActions}>
                <button onClick={downloadQrPng} className={styles.secondaryBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download PNG</span>
                </button>

                <button onClick={downloadQrSvg} className={styles.secondaryBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Download SVG</span>
                </button>

                <button onClick={() => copyStealthLink(qrModalProfile.hash)} className={styles.primaryBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVED PREVIEW MODAL */}
      {previewProfile && (
        <div className={styles.modalBackdrop} onClick={() => setPreviewProfile(null)}>
          <div className={`${styles.modalDialog} ${styles.modalDialogLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Resolved Profile Preview</h3>
                <p className={styles.modalSubtitle}>
                  Simulating production payload for stealth URL: <code style={{ color: '#60a5fa' }}>/p/{previewProfile.hash}</code>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a
                  href={`/p/${previewProfile.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.secondaryBtn}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                >
                  <span>Open Public Link</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <button onClick={() => setPreviewProfile(null)} className={styles.closeBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {previewLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Resolving profile sections and filtered items...</p>
              </div>
            ) : previewData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Candidate Hero Card */}
                <div className={styles.previewResumeHero}>
                  <div className={styles.previewAvatar}>
                    {previewData.basics?.name ? previewData.basics.name.slice(0, 2).toUpperCase() : 'YE'}
                  </div>
                  <div className={styles.previewCandidateDetails}>
                    <span className={styles.previewCandidateName}>{previewData.basics?.name || 'Yonatan Elias'}</span>
                    <span className={styles.previewCandidateHeadline}>{previewData.basics?.headline || 'AI Systems Engineer & Full-Stack Architect'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {previewData.basics?.email} • {previewData.basics?.location}
                    </span>
                  </div>
                </div>

                {/* Section Overview */}
                <div className={styles.previewSectionList}>
                  {previewData.sections && previewData.sections.length > 0 ? (
                    previewData.sections.map((sec) => (
                      <div key={sec.id} className={styles.previewSectionCard}>
                        <div className={styles.previewSectionHeader}>
                          <span className={styles.previewSectionTitle}>
                            <span>{sec.title}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {sec.type}
                            </span>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {sec.items?.length || 0} items cherry-picked
                          </span>
                        </div>

                        <div className={styles.previewItemList}>
                          {sec.items && sec.items.length > 0 ? (
                            sec.items.map((it) => {
                              const d = it.data as Record<string, string | undefined>;
                              const title = d.company || d.school || d.name || d.title || 'Item';
                              const sub = d.position || d.degree || d.proficiency || d.issuer || '';
                              return (
                                <div key={it.id} className={styles.previewItemRow}>
                                  <span style={{ fontWeight: 600 }}>{title}</span>
                                  <span style={{ color: '#94a3b8' }}>{sub}</span>
                                </div>
                              );
                            })
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                              No items selected for this section.
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No sections enabled on this profile.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#f87171' }}>
                Failed to resolve profile preview data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
