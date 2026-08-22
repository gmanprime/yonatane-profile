'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import styles from './editor.module.css';
import dashboardStyles from '../../dashboard.module.css';

interface SectionItemData {
  id?: string;
  sectionId?: string;
  hidden?: boolean;
  displayOrder?: number;
  data: Record<string, unknown>;
}

interface SectionData {
  id: string;
  contentDatasetId: string;
  type: string;
  title: string;
  icon: string;
  columns: number;
  hidden: boolean;
  displayOrder: number;
  items: SectionItemData[];
}

interface BasicsData {
  name?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: { url?: string; label?: string } | string;
  customFields?: Array<{ id?: string; icon?: string; text?: string; link?: string }>;
}

interface DatasetDetail {
  id: string;
  userId: string;
  name: string;
  basics: BasicsData | null;
  summary: string | null;
  picture: Record<string, unknown> | null;
  sections: SectionData[];
  createdAt: string;
  updatedAt: string;
}

const SECTION_TEMPLATES = [
  { type: 'experience', title: 'Work Experience', icon: 'briefcase', defaultItem: { company: '', position: '', location: '', period: '', website: { url: '', label: '' }, description: '' } },
  { type: 'education', title: 'Education', icon: 'graduation-cap', defaultItem: { school: '', degree: '', area: '', grade: '', location: '', period: '', website: { url: '', label: '' }, description: '' } },
  { type: 'skills', title: 'Skills & Technologies', icon: 'code-2', defaultItem: { name: '', proficiency: '', level: 4, keywords: [] } },
  { type: 'projects', title: 'Projects', icon: 'folder-git-2', defaultItem: { name: '', period: '', website: { url: '', label: '' }, description: '' } },
  { type: 'languages', title: 'Languages', icon: 'languages', defaultItem: { language: '', fluency: '', level: 5 } },
  { type: 'certifications', title: 'Certifications', icon: 'award', defaultItem: { title: '', issuer: '', date: '', website: { url: '', label: '' }, description: '' } },
  { type: 'awards', title: 'Honours & Awards', icon: 'trophy', defaultItem: { title: '', awarder: '', date: '', website: { url: '', label: '' }, description: '' } },
  { type: 'volunteer', title: 'Volunteer & Leadership', icon: 'heart-handshake', defaultItem: { organization: '', location: '', period: '', website: { url: '', label: '' }, description: '' } },
  { type: 'profiles', title: 'Social & Web Profiles', icon: 'share-2', defaultItem: { network: '', username: '', website: { url: '', label: '' }, icon: '' } },
  { type: 'interests', title: 'Hobbies & Interests', icon: 'sparkles', defaultItem: { name: '', keywords: [] } },
  { type: 'publications', title: 'Publications', icon: 'book-open', defaultItem: { title: '', publisher: '', date: '', website: { url: '', label: '' }, description: '' } },
  { type: 'references', title: 'References', icon: 'users', defaultItem: { name: '', position: '', phone: '', website: { url: '', label: '' }, description: '' } },
  { type: 'custom', title: 'Custom Section', icon: 'layers', defaultItem: { title: '', subtitle: '', date: '', description: '' } },
];

export default function DatasetEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const datasetId = resolvedParams.id;

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'basics' | 'summary' | 'sections'>('sections');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Accordion state: map sectionId -> boolean
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // Item accordion state: map itemIndex or itemId -> boolean
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Add Section Modal
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState<boolean>(false);
  const [selectedSectionType, setSelectedSectionType] = useState<string>('experience');
  const [customSectionTitle, setCustomSectionTitle] = useState<string>('');

  // Editable Form Data
  const [name, setName] = useState<string>('');
  const [basics, setBasics] = useState<BasicsData>({
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    website: { url: '', label: '' },
    customFields: [],
  });
  const [summary, setSummary] = useState<string>('');
  const [picture, setPicture] = useState<Record<string, unknown>>({ url: '', hidden: false });
  const [sections, setSections] = useState<SectionData[]>([]);

  const showNotification = useCallback((msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await fetch(`/api/v1/content/${datasetId}`);
        if (!res.ok) {
          throw new Error('Failed to load dataset details');
        }
        const data = await res.json();
        const ds: DatasetDetail = data.dataset;
        if (!isMounted) return;

        setName(ds.name);
        setBasics(ds.basics || { name: '', headline: '', email: '', phone: '', location: '', website: { url: '', label: '' }, customFields: [] });
        setSummary(ds.summary || '');
        setPicture(ds.picture || { url: '', hidden: false });
        setSections(ds.sections || []);

        // Auto-expand first 2 sections
        const initialExpanded: Record<string, boolean> = {};
        (ds.sections || []).forEach((sec, idx) => {
          if (idx < 2) initialExpanded[sec.id] = true;
        });
        setExpandedSections(initialExpanded);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error fetching dataset';
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [datasetId]);

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);

      // 1. Update Dataset Top-level (name, basics, summary, picture)
      const res = await fetch(`/api/v1/content/${datasetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Untitled Dataset',
          basics,
          summary,
          picture,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update dataset basics');
      }

      // 2. Sync Sections reorder & updates
      const sectionIds = sections.map((s) => s.id);
      if (sectionIds.length > 0) {
        await fetch(`/api/v1/sections/${datasetId}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sectionIds }),
        });
      }

      showNotification('All dataset changes saved successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving dataset';
      showNotification(msg, true);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // BASICS HELPERS
  // ============================================================
  const updateBasicsField = (key: keyof BasicsData, value: unknown) => {
    setBasics((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomField = () => {
    const cf = basics.customFields || [];
    setBasics({
      ...basics,
      customFields: [...cf, { id: `cf-${Date.now()}`, icon: 'info', text: '', link: '' }],
    });
  };

  const removeCustomField = (index: number) => {
    const cf = [...(basics.customFields || [])];
    cf.splice(index, 1);
    setBasics({ ...basics, customFields: cf });
  };

  const updateCustomField = (index: number, field: string, val: string) => {
    const cf = [...(basics.customFields || [])];
    cf[index] = { ...cf[index], [field]: val };
    setBasics({ ...basics, customFields: cf });
  };

  // ============================================================
  // SECTION CRUD HELPERS
  // ============================================================
  const handleAddSection = async () => {
    const template = SECTION_TEMPLATES.find((t) => t.type === selectedSectionType);
    const title = customSectionTitle.trim() || template?.title || selectedSectionType;

    try {
      setSaving(true);
      const res = await fetch(`/api/v1/sections/${datasetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedSectionType,
          title,
          icon: template?.icon || '',
          columns: 1,
          hidden: false,
          displayOrder: sections.length,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create section');
      }

      const { section } = await res.json();
      const newSec: SectionData = { ...section, items: [] };
      setSections([...sections, newSec]);
      setExpandedSections((prev) => ({ ...prev, [newSec.id]: true }));
      setIsAddSectionModalOpen(false);
      setCustomSectionTitle('');
      showNotification(`Section "${title}" added.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding section';
      showNotification(msg, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string, sectionTitle: string) => {
    if (!window.confirm(`Delete section "${sectionTitle}" and all its items?`)) return;

    try {
      const res = await fetch(`/api/v1/sections/${datasetId}/${sectionId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete section');
      }

      setSections(sections.filter((s) => s.id !== sectionId));
      showNotification(`Section "${sectionTitle}" deleted.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting section';
      showNotification(msg, true);
    }
  };

  const handleUpdateSectionMeta = async (sectionId: string, updates: Partial<SectionData>) => {
    setSections(sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));

    try {
      await fetch(`/api/v1/sections/${datasetId}/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {
      // Background sync
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setSections(reordered);
  };

  // ============================================================
  // SECTION ITEMS CRUD HELPERS
  // ============================================================
  const handleAddItem = async (section: SectionData) => {
    const template = SECTION_TEMPLATES.find((t) => t.type === section.type);
    const defaultData = template?.defaultItem ? { ...template.defaultItem } : { title: '', description: '' };

    try {
      const res = await fetch(`/api/v1/sections/${datasetId}/${section.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: defaultData,
          hidden: false,
          displayOrder: section.items.length,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to add section item');
      }

      const { item } = await res.json();
      setSections(
        sections.map((s) =>
          s.id === section.id ? { ...s, items: [...s.items, item] } : s
        )
      );
      setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
      showNotification('New item added to section.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding item';
      showNotification(msg, true);
    }
  };

  const handleUpdateItem = async (sectionId: string, itemId: string, itemData: Record<string, unknown>, hidden?: boolean) => {
    setSections(
      sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          items: s.items.map((it) =>
            it.id === itemId ? { ...it, data: { ...it.data, ...itemData }, hidden: hidden ?? it.hidden } : it
          ),
        };
      })
    );

    try {
      await fetch(`/api/v1/sections/${datasetId}/${sectionId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: itemData, hidden }),
      });
    } catch {
      // background update
    }
  };

  const handleDeleteItem = async (sectionId: string, itemId: string) => {
    if (!window.confirm('Delete this item?')) return;

    try {
      const res = await fetch(`/api/v1/sections/${datasetId}/${sectionId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete item');
      }

      setSections(
        sections.map((s) =>
          s.id === sectionId ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s
        )
      );
      showNotification('Item deleted.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting item';
      showNotification(msg, true);
    }
  };

  const handleMoveItem = async (sectionId: string, itemIdx: number, direction: 'up' | 'down') => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;

    const targetIdx = direction === 'up' ? itemIdx - 1 : itemIdx + 1;
    if (targetIdx < 0 || targetIdx >= sec.items.length) return;

    const itemsCopy = [...sec.items];
    const [moved] = itemsCopy.splice(itemIdx, 1);
    itemsCopy.splice(targetIdx, 0, moved);

    setSections(sections.map((s) => (s.id === sectionId ? { ...s, items: itemsCopy } : s)));

    const itemIds = itemsCopy.map((it) => it.id).filter(Boolean) as string[];
    try {
      await fetch(`/api/v1/sections/${datasetId}/${sectionId}/items/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
    } catch {
      // background sync
    }
  };

  // ============================================================
  // TAG CHIP HANDLERS FOR SKILLS & INTERESTS
  // ============================================================
  const handleAddTag = (sectionId: string, itemId: string, currentTags: string[], newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || currentTags.includes(trimmed)) return;
    const updated = [...currentTags, trimmed];
    const sec = sections.find((s) => s.id === sectionId);
    const item = sec?.items.find((i) => i.id === itemId);
    if (item) {
      handleUpdateItem(sectionId, itemId, { ...item.data, keywords: updated });
    }
  };

  const handleRemoveTag = (sectionId: string, itemId: string, currentTags: string[], tagToRemove: string) => {
    const updated = currentTags.filter((t) => t !== tagToRemove);
    const sec = sections.find((s) => s.id === sectionId);
    const item = sec?.items.find((i) => i.id === itemId);
    if (item) {
      handleUpdateItem(sectionId, itemId, { ...item.data, keywords: updated });
    }
  };

  const getWebsiteUrl = (): string => {
    if (!basics.website) return '';
    if (typeof basics.website === 'string') return basics.website;
    return basics.website.url || '';
  };

  const getWebsiteLabel = (): string => {
    if (!basics.website || typeof basics.website === 'string') return 'Website';
    return basics.website.label || 'Website';
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className={dashboardStyles.loadingSpinner} style={{ margin: '0 auto 1rem' }} />
        Loading dataset editor...
      </div>
    );
  }

  return (
    <div className={styles.editorRoot}>
      {/* Notifications */}
      {successMessage && <div className={dashboardStyles.alertSuccess}>✓ {successMessage}</div>}
      {errorMessage && <div className={dashboardStyles.alertError}>⚠ {errorMessage}</div>}

      {/* Header Bar */}
      <div className={styles.editorHeader}>
        <div className={styles.titleArea}>
          <Link href="/admin/content" className={styles.backLink} title="Back to Datasets">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <input
            type="text"
            className={styles.datasetNameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dataset Name"
          />
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveAll}
            disabled={saving}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saving ? 'Saving Changes...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'sections' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('sections')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          Polymorphic Sections
          <span className={styles.tabBadge}>{sections.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'basics' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('basics')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Basics & Profile Info
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'summary' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
          </svg>
          Summary & Bio
        </button>
      </div>

      {/* ============================================================
          TAB 1: BASICS & PROFILE INFO
          ============================================================ */}
      {activeTab === 'basics' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Candidate Basics & Contact Details</h3>
              <p className={styles.cardSubtitle}>Configure primary identity fields and custom attributes.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                value={basics.name || ''}
                onChange={(e) => updateBasicsField('name', e.target.value)}
                placeholder="e.g. Yonatan Elias"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Headline / Professional Title</label>
              <input
                type="text"
                className={styles.input}
                value={basics.headline || ''}
                onChange={(e) => updateBasicsField('headline', e.target.value)}
                placeholder="e.g. Computational Data Scientist"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                value={basics.email || ''}
                onChange={(e) => updateBasicsField('email', e.target.value)}
                placeholder="candidate@example.com"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Phone Number</label>
              <input
                type="text"
                className={styles.input}
                value={basics.phone || ''}
                onChange={(e) => updateBasicsField('phone', e.target.value)}
                placeholder="+251 913 448 915"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Location</label>
              <input
                type="text"
                className={styles.input}
                value={basics.location || ''}
                onChange={(e) => updateBasicsField('location', e.target.value)}
                placeholder="Addis Ababa, Ethiopia"
              />
            </div>

            {/* Avatar & Framing Studio */}
            <div className={styles.avatarStudioWrapper}>
              <label className={styles.label} style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>
                Profile Picture &amp; Framing Studio
              </label>

              <div className={styles.avatarStudioGrid}>
                <div className={styles.avatarPreviewContainer}>
                  <div className={styles.avatarPreviewHalo} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(typeof picture.url === 'string' && picture.url) ? picture.url : '/avatar.jpg'}
                    alt="Avatar Preview"
                    className={styles.avatarPreviewImage}
                    style={{
                      borderRadius: typeof picture.borderRadius === 'number' ? `${picture.borderRadius}%` : '50%',
                      objectPosition: (picture.objectPosition as string) || 'center 20%',
                      filter: (picture.effects as any)?.grayscale ? 'grayscale(100%)' : undefined,
                    }}
                  />
                </div>

                <div className={styles.avatarControls}>
                  <div className={styles.avatarButtonRow}>
                    <label className={styles.avatarUploadBtn}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Upload Local Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setPicture({
                                  ...picture,
                                  url: event.target.result as string,
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className={styles.avatarSecondaryBtn}
                      onClick={() => setPicture({ ...picture, url: '/avatar.jpg' })}
                    >
                      Use Master Headshot (/avatar.jpg)
                    </button>
                  </div>

                  <div style={{ marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      className={styles.input}
                      value={typeof picture.url === 'string' ? picture.url : ''}
                      onChange={(e) => setPicture({ ...picture, url: e.target.value })}
                      placeholder="Or enter image URL (https://... or data:image/...)"
                      style={{ fontSize: '0.75rem' }}
                    />
                  </div>

                  <div className={styles.avatarOptionsRow}>
                    <div>
                      <label className={styles.label} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Focal Alignment</label>
                      <select
                        className={styles.input}
                        style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                        value={(picture.objectPosition as string) || 'center 20%'}
                        onChange={(e) => setPicture({ ...picture, objectPosition: e.target.value })}
                      >
                        <option value="center 20%">Portrait / Face Focus (Top 20%)</option>
                        <option value="center top">Top Aligned</option>
                        <option value="center center">True Center (50% 50%)</option>
                        <option value="center 70%">Lower / Body Focus</option>
                      </select>
                    </div>

                    <div>
                      <label className={styles.label} style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Frame Shape</label>
                      <select
                        className={styles.input}
                        style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                        value={typeof picture.borderRadius === 'number' ? picture.borderRadius : 50}
                        onChange={(e) => setPicture({ ...picture, borderRadius: Number(e.target.value) })}
                      >
                        <option value={50}>Circle (Halo Ring)</option>
                        <option value={24}>Squircle (Soft Corner)</option>
                        <option value={10}>Rounded Rectangle</option>
                        <option value={0}>Square</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.375rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean((picture.effects as any)?.grayscale)}
                          onChange={(e) =>
                            setPicture({
                              ...picture,
                              effects: {
                                ...(typeof picture.effects === 'object' ? (picture.effects as any) : {}),
                                grayscale: e.target.checked,
                              },
                            })
                          }
                        />
                        Grayscale Filter
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Primary Website / Portfolio URL</label>
              <input
                type="url"
                className={styles.input}
                value={getWebsiteUrl()}
                onChange={(e) => updateBasicsField('website', { url: e.target.value, label: getWebsiteLabel() })}
                placeholder="https://github.com/..."
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Website Label</label>
              <input
                type="text"
                className={styles.input}
                value={getWebsiteLabel()}
                onChange={(e) =>
                  updateBasicsField('website', {
                    url: getWebsiteUrl(),
                    label: e.target.value,
                  })
                }
                placeholder="GitHub Profile"
              />
            </div>
          </div>

          {/* Custom Fields Sub-editor */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9' }}>Custom Metadata Fields</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>E.g. Citizenship, Date of Birth, Passport, etc.</p>
              </div>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addCustomField}>
                + Add Custom Field
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(basics.customFields || []).map((cf, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className={styles.input}
                    style={{ flex: 1 }}
                    placeholder="Field Text (e.g. American Citizen)"
                    value={cf.text || ''}
                    onChange={(e) => updateCustomField(idx, 'text', e.target.value)}
                  />
                  <input
                    type="text"
                    className={styles.input}
                    style={{ width: '130px' }}
                    placeholder="Icon (e.g. passport)"
                    value={cf.icon || ''}
                    onChange={(e) => updateCustomField(idx, 'icon', e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                    onClick={() => removeCustomField(idx)}
                    title="Remove custom field"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: SUMMARY & BIO
          ============================================================ */}
      {activeTab === 'summary' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Professional Summary & Bio</h3>
              <p className={styles.cardSubtitle}>
                Supports Markdown or formatted HTML descriptions for candidate overview.
              </p>
            </div>
          </div>

          <div className={styles.fieldFull}>
            <div className={styles.markdownToolbar}>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => setSummary((prev) => prev + ' **Bold Text**')}
              >
                B
              </button>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => setSummary((prev) => prev + ' *Italic Text*')}
              >
                I
              </button>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => setSummary((prev) => prev + '\n- Bullet Point')}
              >
                • Bullet
              </button>
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => setSummary((prev) => prev + ' [Link Title](https://...)')}
              >
                🔗 Link
              </button>
            </div>
            <textarea
              className={styles.textarea}
              style={{ minHeight: '200px', borderRadius: '0 0 8px 8px' }}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Write your professional overview or narrative summary..."
            />
          </div>

          {summary && (
            <div style={{ marginTop: '0.5rem' }}>
              <label className={styles.label} style={{ marginBottom: '0.4rem' }}>
                Summary Live Preview
              </label>
              <div
                className={styles.markdownPreviewArea}
                dangerouslySetInnerHTML={{ __html: summary }}
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 3: POLYMORPHIC SECTIONS & ITEMS
          ============================================================ */}
      {activeTab === 'sections' && (
        <div className={styles.sectionsList}>
          {/* Top Bar for Sections */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Showing {sections.length} polymorphic section{sections.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setIsAddSectionModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add New Section
            </button>
          </div>

          {sections.map((section, sIdx) => {
            const isOpen = expandedSections[section.id] !== false;

            return (
              <div
                key={section.id}
                className={`${styles.sectionAccordion} ${isOpen ? styles.sectionAccordionOpen : ''} ${
                  section.hidden ? styles.sectionAccordionHidden : ''
                }`}
              >
                {/* Section Header */}
                <div
                  className={styles.sectionAccordionHeader}
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, [section.id]: !isOpen }))
                  }
                >
                  <div className={styles.sectionHeaderLeft}>
                    <span className={styles.sectionTypePill}>{section.type}</span>
                    <h4 className={styles.sectionTitle}>{section.title}</h4>
                    <span className={styles.sectionItemCountBadge}>
                      {section.items?.length || 0} item{section.items?.length === 1 ? '' : 's'}
                    </span>
                    {section.hidden && (
                      <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
                        (Hidden from Profile)
                      </span>
                    )}
                  </div>

                  <div className={styles.sectionControls} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.btnIcon}
                      title="Move Section Up"
                      disabled={sIdx === 0}
                      onClick={() => handleMoveSection(sIdx, 'up')}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className={styles.btnIcon}
                      title="Move Section Down"
                      disabled={sIdx === sections.length - 1}
                      onClick={() => handleMoveSection(sIdx, 'down')}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      className={styles.btnIcon}
                      title={section.hidden ? 'Show Section' : 'Hide Section'}
                      onClick={() => handleUpdateSectionMeta(section.id, { hidden: !section.hidden })}
                    >
                      {section.hidden ? '👁' : '🕶'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                      title="Delete Section"
                      onClick={() => handleDeleteSection(section.id, section.title)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Section Content & Items */}
                {isOpen && (
                  <div className={styles.sectionBody}>
                    {/* Section Meta Settings */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                      <div className={styles.field}>
                        <label className={styles.label}>Section Title</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={section.title}
                          onChange={(e) => handleUpdateSectionMeta(section.id, { title: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Columns Layout</label>
                        <select
                          className={styles.select}
                          value={section.columns || 1}
                          onChange={(e) =>
                            handleUpdateSectionMeta(section.id, { columns: parseInt(e.target.value, 10) })
                          }
                        >
                          <option value={1}>1 Column (Standard Full Width)</option>
                          <option value={2}>2 Columns (Grid Side-by-Side)</option>
                        </select>
                      </div>
                    </div>

                    {/* Section Items List */}
                    <div className={styles.itemsContainer}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>
                          Items ({section.items?.length || 0})
                        </span>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => handleAddItem(section)}
                        >
                          + Add Item
                        </button>
                      </div>

                      {section.items?.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', color: '#64748b' }}>
                          No items in this section yet. Click &quot;+ Add Item&quot; above to create one.
                        </div>
                      ) : (
                        section.items.map((item, itemIdx) => {
                          const itemId = item.id || `temp-${itemIdx}`;
                          const isItemOpen = expandedItems[itemId] !== false;
                          const data = (item.data || {}) as Record<string, unknown>;

                          return (
                            <div
                              key={itemId}
                              className={`${styles.itemCard} ${item.hidden ? styles.itemCardHidden : ''}`}
                            >
                              {/* Item Card Header */}
                              <div
                                className={styles.itemCardHeader}
                                onClick={() =>
                                  setExpandedItems((prev) => ({ ...prev, [itemId]: !isItemOpen }))
                                }
                              >
                                <div>
                                  <span className={styles.itemTitle}>
                                    {(data.company as string) ||
                                      (data.school as string) ||
                                      (data.name as string) ||
                                      (data.title as string) ||
                                      (data.organization as string) ||
                                      (data.language as string) ||
                                      `Item #${itemIdx + 1}`}
                                  </span>
                                  <span className={styles.itemSubtitle}>
                                    {(data.position as string) || (data.degree as string) || (data.proficiency as string) || (data.issuer as string) || (data.fluency as string) || ''}
                                  </span>
                                </div>

                                <div className={styles.sectionControls} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className={styles.btnIcon}
                                    disabled={itemIdx === 0}
                                    onClick={() => handleMoveItem(section.id, itemIdx, 'up')}
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnIcon}
                                    disabled={itemIdx === (section.items?.length || 0) - 1}
                                    onClick={() => handleMoveItem(section.id, itemIdx, 'down')}
                                  >
                                    ▼
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnIcon}
                                    title={item.hidden ? 'Show Item' : 'Hide Item'}
                                    onClick={() =>
                                      handleUpdateItem(section.id, item.id!, data, !item.hidden)
                                    }
                                  >
                                    {item.hidden ? '👁' : '🕶'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                                    onClick={() => handleDeleteItem(section.id, item.id!)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Item Dynamic Polymorphic Form */}
                              {isItemOpen && (
                                <div className={styles.itemCardBody}>
                                  {/* ---------------- EXPERIENCE ---------------- */}
                                  {section.type === 'experience' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Company / Organization</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.company as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, company: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Position / Role</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.position as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, position: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Period (e.g. 2022 - Present)</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.period as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, period: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Location</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.location as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, location: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Description & Bullet Points (Markdown / HTML)</label>
                                        <textarea
                                          className={styles.textarea}
                                          value={(data.description as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, description: e.target.value })
                                          }
                                          placeholder="• Bullet points or summary of accomplishments..."
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- EDUCATION ---------------- */}
                                  {section.type === 'education' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>School / University</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.school as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, school: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Degree</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.degree as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, degree: e.target.value })
                                          }
                                          placeholder="e.g. Master of Science (MSc)"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Major / Area of Study</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.area as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, area: e.target.value })
                                          }
                                          placeholder="Computational Data Science"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Grade / GPA</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.grade as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, grade: e.target.value })
                                          }
                                          placeholder="3.89 / 4.0"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Period</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.period as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, period: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Location</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.location as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, location: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Thesis / Coursework Description</label>
                                        <textarea
                                          className={styles.textarea}
                                          value={(data.description as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, description: e.target.value })
                                          }
                                          placeholder="Thesis topics, specializations..."
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- SKILLS ---------------- */}
                                  {section.type === 'skills' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Skill Category Name</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.name as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, name: e.target.value })
                                          }
                                          placeholder="e.g. Programming Languages"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Proficiency / Subtitle</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.proficiency as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, proficiency: e.target.value })
                                          }
                                          placeholder="Frontend & Backend Frameworks"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>
                                          <span>Proficiency Rating (1-5)</span>
                                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                                            {((data.level as number) || 4)} / 5
                                          </span>
                                        </label>
                                        <div className={styles.levelRating}>
                                          {[1, 2, 3, 4, 5].map((lvl) => (
                                            <button
                                              key={lvl}
                                              type="button"
                                              className={`${styles.starBtn} ${((data.level as number) || 4) >= lvl ? styles.starBtnActive : ''}`}
                                              onClick={() =>
                                                handleUpdateItem(section.id, item.id!, { ...data, level: lvl })
                                              }
                                            >
                                              ★
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>
                                          <span>Keywords & Tech Stack (Tag Chips)</span>
                                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                            Type keyword and press Enter or comma
                                          </span>
                                        </label>
                                        <div className={styles.tagContainer}>
                                          {((data.keywords as string[]) || []).map((kw: string, kwIdx: number) => (
                                            <span key={kwIdx} className={styles.tagChip}>
                                              {kw}
                                              <button
                                                type="button"
                                                className={styles.tagRemoveBtn}
                                                onClick={() =>
                                                  handleRemoveTag(section.id, item.id!, (data.keywords as string[]) || [], kw)
                                                }
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                          <input
                                            type="text"
                                            className={styles.tagInput}
                                            placeholder="+ Add tag and press Enter"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                handleAddTag(
                                                  section.id,
                                                  item.id!,
                                                  (data.keywords as string[]) || [],
                                                  (e.target as HTMLInputElement).value
                                                );
                                                (e.target as HTMLInputElement).value = '';
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- PROJECTS ---------------- */}
                                  {section.type === 'projects' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Project Name</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.name as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, name: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Period / Timeline</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.period as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, period: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Project URL / Repo Link</label>
                                        <input
                                          type="url"
                                          className={styles.input}
                                          value={(data.website as { url?: string } | undefined)?.url || ''}
                                          onChange={(e) => {
                                            const currentWeb = (typeof data.website === 'object' && data.website !== null ? data.website : {}) as Record<string, unknown>;
                                            handleUpdateItem(section.id, item.id!, {
                                              ...data,
                                              website: { ...currentWeb, url: e.target.value },
                                            });
                                          }}
                                          placeholder="https://github.com/..."
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Link Label</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.website as { label?: string } | undefined)?.label || ''}
                                          onChange={(e) => {
                                            const currentWeb = (typeof data.website === 'object' && data.website !== null ? data.website : {}) as Record<string, unknown>;
                                            handleUpdateItem(section.id, item.id!, {
                                              ...data,
                                              website: { ...currentWeb, label: e.target.value },
                                            });
                                          }}
                                          placeholder="GitHub Repository"
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Description (Markdown / HTML)</label>
                                        <textarea
                                          className={styles.textarea}
                                          value={(data.description as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, description: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- LANGUAGES ---------------- */}
                                  {section.type === 'languages' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Language</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.language as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, language: e.target.value })
                                          }
                                          placeholder="e.g. English, German"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Fluency Level</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.fluency as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, fluency: e.target.value })
                                          }
                                          placeholder="Mother Tongue / Native (C2)"
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Fluency Rating (1-5)</label>
                                        <div className={styles.levelRating}>
                                          {[1, 2, 3, 4, 5].map((lvl) => (
                                            <button
                                              key={lvl}
                                              type="button"
                                              className={`${styles.starBtn} ${((data.level as number) || 5) >= lvl ? styles.starBtnActive : ''}`}
                                              onClick={() =>
                                                handleUpdateItem(section.id, item.id!, { ...data, level: lvl })
                                              }
                                            >
                                              ★
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- CERTIFICATIONS & AWARDS ---------------- */}
                                  {(section.type === 'certifications' || section.type === 'awards') && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Title</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.title as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, title: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>
                                          {section.type === 'certifications' ? 'Issuer / Organization' : 'Awarder'}
                                        </label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.issuer as string) || (data.awarder as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, {
                                              ...data,
                                              [section.type === 'certifications' ? 'issuer' : 'awarder']: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Date</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.date as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, date: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Description</label>
                                        <textarea
                                          className={styles.textarea}
                                          value={(data.description as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, description: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- VOLUNTEER ---------------- */}
                                  {section.type === 'volunteer' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Organization</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.organization as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, organization: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Location</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.location as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, location: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Period</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.period as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, period: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Description</label>
                                        <textarea
                                          className={styles.textarea}
                                          value={(data.description as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, description: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- PROFILES ---------------- */}
                                  {section.type === 'profiles' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Platform / Network</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.network as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, network: e.target.value })
                                          }
                                          placeholder="LinkedIn, GitHub, Twitter..."
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Username / Handle</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.username as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, username: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Profile URL</label>
                                        <input
                                          type="url"
                                          className={styles.input}
                                          value={(data.website as { url?: string } | undefined)?.url || ''}
                                          onChange={(e) => {
                                            const currentWeb = (typeof data.website === 'object' && data.website !== null ? data.website : {}) as Record<string, unknown>;
                                            handleUpdateItem(section.id, item.id!, {
                                              ...data,
                                              website: { ...currentWeb, url: e.target.value },
                                            });
                                          }}
                                          placeholder="https://..."
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- INTERESTS ---------------- */}
                                  {section.type === 'interests' && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Interest / Hobby Title</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.name as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, name: e.target.value })
                                          }
                                          placeholder="e.g. Basketball, Music"
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Keywords</label>
                                        <div className={styles.tagContainer}>
                                          {((data.keywords as string[]) || []).map((kw: string, kwIdx: number) => (
                                            <span key={kwIdx} className={styles.tagChip}>
                                              {kw}
                                              <button
                                                type="button"
                                                className={styles.tagRemoveBtn}
                                                onClick={() =>
                                                  handleRemoveTag(section.id, item.id!, (data.keywords as string[]) || [], kw)
                                                }
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                          <input
                                            type="text"
                                            className={styles.tagInput}
                                            placeholder="+ Add tag and press Enter"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                handleAddTag(
                                                  section.id,
                                                  item.id!,
                                                  (data.keywords as string[]) || [],
                                                  (e.target as HTMLInputElement).value
                                                );
                                                (e.target as HTMLInputElement).value = '';
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* ---------------- GENERIC / CUSTOM ---------------- */}
                                  {['publications', 'references', 'custom'].includes(section.type) && (
                                    <div className={styles.formGrid}>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Title / Headline</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.title as string) || (data.name as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, title: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className={styles.field}>
                                        <label className={styles.label}>Subtitle / Publisher / Phone</label>
                                        <input
                                          type="text"
                                          className={styles.input}
                                          value={(data.subtitle as string) || (data.publisher as string) || (data.phone as string) || (data.position as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, {
                                              ...data,
                                              subtitle: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div className={styles.fieldFull}>
                                        <label className={styles.label}>Description</label>
                                        <textarea
                                          className={styles.textarea}
                                          value={(data.description as string) || ''}
                                          onChange={(e) =>
                                            handleUpdateItem(section.id, item.id!, { ...data, description: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          ADD NEW SECTION MODAL
          ============================================================ */}
      {isAddSectionModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsAddSectionModalOpen(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Add New Polymorphic Section</h3>
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => setIsAddSectionModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Select Section Type</label>
                <select
                  className={styles.select}
                  value={selectedSectionType}
                  onChange={(e) => setSelectedSectionType(e.target.value)}
                >
                  {SECTION_TEMPLATES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.title} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Custom Section Title (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Defaults to template title"
                  value={customSectionTitle}
                  onChange={(e) => setCustomSectionTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setIsAddSectionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleAddSection}
                >
                  Create Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
