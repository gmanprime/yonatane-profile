'use client';

import React, { useState, useEffect, useId, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import styles from './studio.module.css';
import modalStyles from '../profiles.module.css';

interface SectionItem {
  id: string;
  sectionId: string;
  data: Record<string, unknown>;
  hidden: boolean;
  displayOrder: number;
}

interface Section {
  id: string;
  type: string;
  title: string;
  icon: string | null;
  columns: number | null;
  hidden: boolean;
  displayOrder: number;
  items: SectionItem[];
}

interface ContentDataset {
  id: string;
  name: string;
  sections: Section[];
}

interface ProfileSectionOverride {
  id?: string;
  sectionId: string;
  visible: boolean;
  selectedItemIds: string[];
  displayOrder: number;
}

interface ProfileData {
  id: string;
  name: string;
  description: string | null;
  hash: string;
  isDefault: boolean;
  contentDatasetId: string | null;
  themeId: string | null;
  contentDataset?: ContentDataset | null;
  theme?: { id: string; name: string } | null;
  profileSections: ProfileSectionOverride[];
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

export default function AdminProfileStudioPage() {
  const params = useParams();
  const profileId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hash, setHash] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [contentDatasetId, setContentDatasetId] = useState<string>('');
  const [themeId, setThemeId] = useState<string>('');

  // Datasets and Themes catalogs
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [currentDataset, setCurrentDataset] = useState<ContentDataset | null>(null);

  // Profile Sections Composition State
  const [sectionsConfig, setSectionsConfig] = useState<
    Array<{
      sectionId: string;
      sectionTitle: string;
      sectionType: string;
      visible: boolean;
      selectedItemIds: string[];
      displayOrder: number;
      items: SectionItem[];
    }>
  >([]);

  // Expanded accordions for cherry-picking
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({});

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const makeDefaultSwitchId = useId();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Merge dataset sections with profile overrides
  const initSectionsComposition = useCallback((
    dataset: ContentDataset,
    overrides: ProfileSectionOverride[] = []
  ) => {
    const overrideMap = new Map<string, ProfileSectionOverride>();
    overrides.forEach((o) => overrideMap.set(o.sectionId, o));

    const initialConfig = (dataset.sections || []).map((sec, idx) => {
      const override = overrideMap.get(sec.id);
      const isSecVisible = override !== undefined ? override.visible : !sec.hidden;
      const selectedIds = override?.selectedItemIds && override.selectedItemIds.length > 0
        ? override.selectedItemIds
        : (sec.items || []).filter((i) => !i.hidden).map((i) => i.id);

      return {
        sectionId: sec.id,
        sectionTitle: sec.title,
        sectionType: sec.type,
        visible: isSecVisible,
        selectedItemIds: selectedIds,
        displayOrder: override?.displayOrder ?? sec.displayOrder ?? idx,
        items: sec.items || [],
      };
    });

    initialConfig.sort((a, b) => a.displayOrder - b.displayOrder);
    setSectionsConfig(initialConfig);
  }, []);

  // Load Profile & Related Data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [pRes, dRes, tRes] = await Promise.all([
          fetch(`/api/v1/profiles/${profileId}`),
          fetch('/api/v1/content'),
          fetch('/api/v1/themes'),
        ]);

        if (!pRes.ok) {
          throw new Error('Profile not found');
        }

        const pData = await pRes.json();
        const profile: ProfileData = pData.profile;

        setName(profile.name || '');
        setDescription(profile.description || '');
        setHash(profile.hash || '');
        setIsDefault(profile.isDefault || false);
        setContentDatasetId(profile.contentDatasetId || '');
        setThemeId(profile.themeId || '');

        if (dRes.ok) {
          const dData = await dRes.json();
          setDatasets(dData.datasets || []);
        }

        if (tRes.ok) {
          const tData = await tRes.json();
          setThemes(tData.themes || []);
        }

        // Initialize Section Composition from linked dataset
        if (profile.contentDataset) {
          setCurrentDataset(profile.contentDataset);
          initSectionsComposition(profile.contentDataset, profile.profileSections);
        } else if (profile.contentDatasetId) {
          // Fetch dataset directly if not nested
          const dsRes = await fetch(`/api/v1/content/${profile.contentDatasetId}`);
          if (dsRes.ok) {
            const dsData = await dsRes.json();
            setCurrentDataset(dsData.dataset);
            initSectionsComposition(dsData.dataset, profile.profileSections);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        showToast('Error loading profile');
      } finally {
        setLoading(false);
      }
    }

    if (profileId) {
      init();
    }
  }, [profileId, initSectionsComposition, showToast]);

  // Handle changing the dataset
  const handleDatasetChange = async (newDatasetId: string) => {
    setContentDatasetId(newDatasetId);
    setIsDirty(true);
    if (!newDatasetId) {
      setCurrentDataset(null);
      setSectionsConfig([]);
      return;
    }

    try {
      const res = await fetch(`/api/v1/content/${newDatasetId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentDataset(data.dataset);
        initSectionsComposition(data.dataset, []);
        showToast(`Linked dataset "${data.dataset.name}". Sections refreshed!`);
      }
    } catch (err) {
      console.error('Error fetching new dataset:', err);
    }
  };

  // Generate Unique Stealth Hash
  const handleRegenerateHash = async () => {
    try {
      const res = await fetch('/api/v1/profiles/generate-hash');
      if (res.ok) {
        const data = await res.json();
        setHash(data.hash);
        setIsDirty(true);
        showToast('New 8-character stealth hash generated!');
      }
    } catch (err) {
      console.error('Error generating hash:', err);
    }
  };

  // Move Section Up/Down
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sectionsConfig.length) return;

    const updated = [...sectionsConfig];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    updated.forEach((s, idx) => {
      s.displayOrder = idx;
    });

    setSectionsConfig(updated);
    setIsDirty(true);
  };

  // Toggle Section Visibility
  const toggleSectionVisibility = (sectionId: string) => {
    setSectionsConfig((prev) =>
      prev.map((s) => (s.sectionId === sectionId ? { ...s, visible: !s.visible } : s))
    );
    setIsDirty(true);
  };

  // Toggle Item Cherry-Pick
  const toggleItemSelection = (sectionId: string, itemId: string) => {
    setSectionsConfig((prev) =>
      prev.map((s) => {
        if (s.sectionId !== sectionId) return s;
        const exists = s.selectedItemIds.includes(itemId);
        const updatedSelected = exists
          ? s.selectedItemIds.filter((id) => id !== itemId)
          : [...s.selectedItemIds, itemId];
        return { ...s, selectedItemIds: updatedSelected };
      })
    );
    setIsDirty(true);
  };

  // Select All Items in Section
  const handleSelectAllItems = (sectionId: string) => {
    setSectionsConfig((prev) =>
      prev.map((s) => {
        if (s.sectionId !== sectionId) return s;
        return {
          ...s,
          selectedItemIds: s.items.map((i) => i.id),
        };
      })
    );
    setIsDirty(true);
  };

  // Deselect All Items in Section
  const handleDeselectAllItems = (sectionId: string) => {
    setSectionsConfig((prev) =>
      prev.map((s) => {
        if (s.sectionId !== sectionId) return s;
        return {
          ...s,
          selectedItemIds: [],
        };
      })
    );
    setIsDirty(true);
  };

  // Toggle Accordion Drawer
  const toggleDrawer = (sectionId: string) => {
    setOpenDrawers((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Save All Changes (Profile Settings + Section Composition)
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      alert('Profile name is required');
      return;
    }

    try {
      setSaving(true);

      // 1. Update Profile Metadata
      const profilePayload = {
        name: name.trim(),
        description: description.trim() || null,
        hash: hash.trim() || undefined,
        contentDatasetId: contentDatasetId || null,
        themeId: themeId || null,
        isDefault,
      };

      const pRes = await fetch(`/api/v1/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });

      if (!pRes.ok) {
        const err = await pRes.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      // 2. Update Profile Sections Composition
      if (sectionsConfig.length > 0) {
        const sectionsPayload = {
          sections: sectionsConfig.map((s, idx) => ({
            sectionId: s.sectionId,
            visible: s.visible,
            selectedItemIds: s.selectedItemIds,
            displayOrder: idx,
          })),
        };

        const sRes = await fetch(`/api/v1/profiles/${profileId}/sections`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sectionsPayload),
        });

        if (!sRes.ok) {
          throw new Error('Failed to update profile sections');
        }
      }

      setIsDirty(false);
      showToast('Profile composition saved successfully!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error saving profile';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // Open QR Code Modal
  const openQrModal = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yonatanelias.dpdns.org';
    const targetUrl = `${origin}/p/${hash}`;

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
      setShowQrModal(true);
    } catch (err) {
      console.error('Error generating QR:', err);
    }
  };

  // Open Preview Modal
  const openPreviewModal = async () => {
    setShowPreviewModal(true);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/v1/public/${hash}`);
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

  // Download QR Code PNG
  const downloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `stealth-qr-${hash}.png`;
    a.click();
  };

  // Download QR Code SVG
  const downloadQrSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stealth-qr-${hash}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyStealthUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yonatanelias.dpdns.org';
    navigator.clipboard.writeText(`${origin}/p/${hash}`);
    showToast('Stealth link copied to clipboard!');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>Loading Profile Composition Studio...</p>
      </div>
    );
  }

  return (
    <div className={styles.studioRoot}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
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

      {/* Top Navigation */}
      <section className={styles.topNav}>
        <div className={styles.navLeft}>
          <Link href="/admin/profiles" className={styles.backBtn} title="Back to Profiles">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className={styles.profileNameHeader}>
            <h2 className={styles.titleText}>{name || 'Untitled Stealth Profile'}</h2>
            <div className={styles.stealthHashBadge}>
              <span>/p/{hash}</span>
              <button
                type="button"
                onClick={copyStealthUrl}
                style={{ background: 'transparent', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: 0, display: 'flex' }}
                title="Copy stealth link"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.navActions}>
          <button onClick={openQrModal} className={styles.secondaryBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>QR Code</span>
          </button>

          <button onClick={openPreviewModal} className={styles.secondaryBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Test Preview</span>
          </button>

          <a
            href={`/p/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondaryBtn}
          >
            <span>Open Public URL</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </section>

      {/* SECTION 1: Profile Settings & Stealth Parameters */}
      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <h3 className={styles.settingsTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Profile Configuration & Target Audience</span>
          </h3>
        </div>

        <div className={styles.settingsGrid}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Profile Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              className={styles.textInput}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>
              <span>Stealth URL Slug</span>
              <span style={{ color: '#64748b', fontSize: '0.725rem' }}>8-char opaque identifier</span>
            </label>
            <div className={styles.hashInputWrapper}>
              <input
                type="text"
                required
                maxLength={16}
                value={hash}
                onChange={(e) => {
                  setHash(e.target.value);
                  setIsDirty(true);
                }}
                className={`${styles.textInput} ${styles.hashInput}`}
              />
              <button type="button" onClick={handleRegenerateHash} className={styles.regenHashBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>Regenerate</span>
              </button>
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Assigned Source Dataset</label>
            <select
              value={contentDatasetId}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">-- None Selected --</option>
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
              value={themeId}
              onChange={(e) => {
                setThemeId(e.target.value);
                setIsDirty(true);
              }}
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

          <div className={`${styles.formField} ${styles.formFieldFull}`}>
            <label className={styles.formLabel}>Target Audience / Strategic Context Notes</label>
            <textarea
              placeholder="e.g. Tailored for Founders / YC Pitch — highlights 0-to-1 architectures, LLM agents, and high-traction projects."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              className={styles.textareaInput}
              style={{ minHeight: '75px' }}
            />
          </div>

          <div className={`${styles.formField} ${styles.formFieldFull}`}>
            <div className={styles.switchRow}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
                  Make Primary / Default Profile
                </div>
                <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                  Traffic arriving at the domain root will automatically render this profile.
                </div>
              </div>
              <label className={styles.switch} htmlFor={makeDefaultSwitchId}>
                <input
                  id={makeDefaultSwitchId}
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => {
                    setIsDefault(e.target.checked);
                    setIsDirty(true);
                  }}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Fine-Grained Section Composition & Item Cherry-Picking Studio */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className={styles.compositionHeader}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Section Composition & Cherry-Picking Studio
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Choose which sections appear in this profile and cherry-pick specific jobs, skills, or projects.
            </p>
          </div>
          {currentDataset && (
            <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              Source: <strong>{currentDataset.name}</strong>
            </span>
          )}
        </div>

        <div className={styles.studioBanner}>
          <svg className={styles.bannerIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <div className={styles.bannerTitle}>Precision Cherry-Picking Active</div>
            <div className={styles.bannerText}>
              Turn sections on/off to shape your presentation. Expand any section to toggle individual items (e.g. show only relevant roles or highlight specific skill sets for this opportunity).
            </div>
          </div>
        </div>

        {sectionsConfig.length > 0 ? (
          <div className={styles.sectionsList}>
            {sectionsConfig.map((sec, secIdx) => {
              const isOpen = !!openDrawers[sec.sectionId];
              const totalItems = sec.items.length;
              const selectedCount = sec.selectedItemIds.length;

              return (
                <div
                  key={sec.sectionId}
                  className={`${styles.sectionCard} ${!sec.visible ? styles.sectionCardHidden : ''}`}
                >
                  {/* Section Header Row */}
                  <div
                    className={`${styles.sectionHeaderRow} ${isOpen ? styles.sectionHeaderRowOpen : ''}`}
                    onClick={() => toggleDrawer(sec.sectionId)}
                  >
                    <div className={styles.sectionHeaderLeft}>
                      <span className={styles.sectionTypePill}>{sec.sectionType}</span>
                      <h4 className={styles.sectionTitle}>{sec.sectionTitle}</h4>
                      <span className={styles.itemCountBadge}>
                        {sec.visible
                          ? selectedCount === totalItems
                            ? `All ${totalItems} items included`
                            : `${selectedCount} of ${totalItems} items selected`
                          : 'Section Hidden'}
                      </span>
                    </div>

                    <div className={styles.sectionHeaderControls} onClick={(e) => e.stopPropagation()}>
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => moveSection(secIdx, 'up')}
                        disabled={secIdx === 0}
                        className={styles.ctrlBtn}
                        title="Move Up"
                        style={{ opacity: secIdx === 0 ? 0.3 : 1 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => moveSection(secIdx, 'down')}
                        disabled={secIdx === sectionsConfig.length - 1}
                        className={styles.ctrlBtn}
                        title="Move Down"
                        style={{ opacity: secIdx === sectionsConfig.length - 1 ? 0.3 : 1 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Master Visibility Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility(sec.sectionId)}
                        className={styles.ctrlBtn}
                        title={sec.visible ? 'Hide Section' : 'Show Section'}
                        style={{ color: sec.visible ? '#34d399' : '#f87171' }}
                      >
                        {sec.visible ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>

                      {/* Expand / Collapse Drawer Arrow */}
                      <button
                        type="button"
                        onClick={() => toggleDrawer(sec.sectionId)}
                        className={styles.ctrlBtn}
                        title={isOpen ? 'Collapse items' : 'Expand items'}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Item Cherry-Picking Drawer */}
                  {isOpen && (
                    <div className={styles.cherryPickDrawer}>
                      <div className={styles.cherryPickHeader}>
                        <span className={styles.cherryPickTitle}>
                          Items in {sec.sectionTitle} ({sec.items.length} total)
                        </span>
                        <div className={styles.cherryPickActions}>
                          <button
                            type="button"
                            onClick={() => handleSelectAllItems(sec.sectionId)}
                            className={styles.quickSelectBtn}
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeselectAllItems(sec.sectionId)}
                            className={styles.quickSelectBtn}
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {sec.items.length > 0 ? (
                        <div className={styles.itemsGrid}>
                          {sec.items.map((item) => {
                            const isSelected = sec.selectedItemIds.includes(item.id);
                            const d = item.data as Record<string, unknown>;

                            // Polymorphic Title & Subtitle extraction
                            let itemTitle = 'Untitled Item';
                            let itemSubtitle = '';
                            let itemKeywords: string[] = [];

                            if (sec.sectionType === 'experience') {
                              itemTitle = (d.position as string) || 'Position';
                              itemSubtitle = `${(d.company as string) || ''} ${d.period ? `• ${d.period}` : ''} ${d.location ? `• ${d.location}` : ''}`;
                            } else if (sec.sectionType === 'education') {
                              itemTitle = d.degree ? `${d.degree} in ${(d.area as string) || ''}` : ((d.school as string) || 'School');
                              itemSubtitle = `${(d.school as string) || ''} ${d.period ? `• ${d.period}` : ''}`;
                            } else if (sec.sectionType === 'skills') {
                              itemTitle = (d.name as string) || 'Skill Category';
                              itemSubtitle = d.proficiency ? `Proficiency: ${d.proficiency}` : `Level: ${d.level || 5} Stars`;
                              itemKeywords = Array.isArray(d.keywords) ? (d.keywords as string[]) : [];
                            } else if (sec.sectionType === 'projects') {
                              itemTitle = (d.name as string) || 'Project';
                              const websiteObj = d.website as { url?: string } | undefined;
                              itemSubtitle = `${(d.period as string) || ''} ${websiteObj?.url ? `• ${websiteObj.url}` : ''}`;
                            } else if (sec.sectionType === 'certifications' || sec.sectionType === 'awards') {
                              itemTitle = (d.title as string) || 'Certification';
                              itemSubtitle = `${(d.issuer as string) || (d.awarder as string) || ''} ${d.date ? `• ${d.date}` : ''}`;
                            } else if (sec.sectionType === 'volunteer') {
                              itemTitle = (d.organization as string) || 'Volunteer Role';
                              itemSubtitle = (d.period as string) || '';
                            } else if (sec.sectionType === 'profiles') {
                              itemTitle = (d.network as string) || 'Social Link';
                              itemSubtitle = (d.username as string) || (d.website as string) || '';
                            } else {
                              itemTitle = (d.title as string) || (d.name as string) || 'Item';
                              itemSubtitle = (d.subtitle as string) || (d.date as string) || '';
                            }

                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleItemSelection(sec.sectionId, item.id)}
                                className={`${styles.itemCherryCard} ${isSelected ? styles.itemCherryCardSelected : ''}`}
                              >
                                <div className={styles.itemCherryLeft}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // Handled by parent container click
                                    className={styles.itemCheckbox}
                                  />
                                  <div className={styles.itemInfoCol}>
                                    <span className={styles.itemMainTitle}>{itemTitle}</span>
                                    {itemSubtitle && <span className={styles.itemSubtitle}>{itemSubtitle}</span>}
                                    {itemKeywords.length > 0 && (
                                      <div className={styles.itemChipsRow}>
                                        {itemKeywords.map((k, kIdx) => (
                                          <span key={kIdx} className={styles.itemChip}>
                                            {k}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? '#60a5fa' : '#64748b' }}>
                                  {isSelected ? 'Included' : 'Excluded'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          No items present in this section.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              No dataset currently linked to this profile. Select a dataset above to configure section composition.
            </p>
          </div>
        )}
      </section>

      {/* STICKY ACTION FOOTER */}
      <div className={styles.stickyFooter}>
        <div className={styles.footerLeft}>
          {isDirty ? (
            <div className={styles.dirtyStatusBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Unsaved composition changes</span>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>All changes saved</span>
            </div>
          )}
        </div>

        <div className={styles.footerActions}>
          <Link href="/admin/profiles" className={styles.secondaryBtn}>
            Back to Profiles
          </Link>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className={styles.primaryBtn}
          >
            {saving ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Saving Studio...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>Save Composition</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR MODAL */}
      {showQrModal && (
        <div className={modalStyles.modalBackdrop} onClick={() => setShowQrModal(false)}>
          <div className={modalStyles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.modalHeader}>
              <div>
                <h3 className={modalStyles.modalTitle}>Stealth QR Code</h3>
                <p className={modalStyles.modalSubtitle}>High-contrast scannable link for &quot;{name}&quot;</p>
              </div>
              <button onClick={() => setShowQrModal(false)} className={modalStyles.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={modalStyles.qrContainer}>
              <div className={modalStyles.qrCanvasWrapper}>
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR for ${name}`} width={240} height={240} style={{ display: 'block' }} />
                )}
              </div>

              <div className={modalStyles.qrLinkPill}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>/p/{hash}</span>
              </div>

              <div className={modalStyles.qrActions}>
                <button onClick={downloadQrPng} className={modalStyles.secondaryBtn}>
                  Download PNG
                </button>
                <button onClick={downloadQrSvg} className={modalStyles.secondaryBtn}>
                  Download SVG
                </button>
                <button onClick={copyStealthUrl} className={modalStyles.primaryBtn}>
                  Copy Stealth Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVED PREVIEW MODAL */}
      {showPreviewModal && (
        <div className={modalStyles.modalBackdrop} onClick={() => setShowPreviewModal(false)}>
          <div className={`${modalStyles.modalDialog} ${modalStyles.modalDialogLarge}`} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.modalHeader}>
              <div>
                <h3 className={modalStyles.modalTitle}>Resolved Profile Preview</h3>
                <p className={modalStyles.modalSubtitle}>
                  Simulating live output for <code style={{ color: '#60a5fa' }}>/p/{hash}</code>
                </p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className={modalStyles.closeBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {previewLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Resolving profile sections...</p>
              </div>
            ) : previewData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Candidate Hero Card */}
                <div className={modalStyles.previewResumeHero}>
                  <div className={modalStyles.previewAvatar}>
                    {previewData.basics?.name ? previewData.basics.name.slice(0, 2).toUpperCase() : 'YE'}
                  </div>
                  <div className={modalStyles.previewCandidateDetails}>
                    <span className={modalStyles.previewCandidateName}>{previewData.basics?.name || 'Yonatan Elias'}</span>
                    <span className={modalStyles.previewCandidateHeadline}>{previewData.basics?.headline || 'AI Systems Engineer & Full-Stack Architect'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {previewData.basics?.email} • {previewData.basics?.location}
                    </span>
                  </div>
                </div>

                {/* Section Overview */}
                <div className={modalStyles.previewSectionList}>
                  {previewData.sections && previewData.sections.length > 0 ? (
                    previewData.sections.map((sec) => (
                      <div key={sec.id} className={modalStyles.previewSectionCard}>
                        <div className={modalStyles.previewSectionHeader}>
                          <span className={modalStyles.previewSectionTitle}>
                            <span>{sec.title}</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {sec.type}
                            </span>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {sec.items?.length || 0} items active
                          </span>
                        </div>

                        <div className={modalStyles.previewItemList}>
                          {sec.items && sec.items.length > 0 ? (
                            sec.items.map((it) => {
                              const d = it.data as Record<string, string | undefined>;
                              const title = d.company || d.school || d.name || d.title || 'Item';
                              const sub = d.position || d.degree || d.proficiency || d.issuer || '';
                              return (
                                <div key={it.id} className={modalStyles.previewItemRow}>
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
                Failed to load preview payload.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
