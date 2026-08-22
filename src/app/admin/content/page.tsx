'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './content.module.css';
import dashboardStyles from '../dashboard.module.css';

interface DatasetMeta {
  id: string;
  name: string;
  basics: Record<string, unknown> | null;
  summary: string | null;
  picture: Record<string, unknown> | null;
  rawJson: unknown;
  createdAt: string;
  updatedAt: string;
  sectionsCount: number;
  itemsCount: number;
  sectionTypes: string[];
  isPrimary: boolean;
}

interface ParsedPreview {
  format: 'rxresume' | 'jsonresume' | 'unknown';
  name: string;
  basics: {
    name?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    customFieldsCount?: number;
  };
  summarySnippet: string;
  sections: Array<{ type: string; title: string; count: number }>;
  rawData: Record<string, unknown>;
}

export default function AdminContentPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newDatasetName, setNewDatasetName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Import dropzone & preview state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<ParsedPreview | null>(null);
  const [importDatasetName, setImportDatasetName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RxResume Cloud Sync State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [rxApiKey, setRxApiKey] = useState<string>('');
  const [rxBaseUrl, setRxBaseUrl] = useState<string>('https://rxresu.me');
  const [rxResumes, setRxResumes] = useState<Array<{ id: string; title: string; slug: string; updatedAt?: string; isLocked?: boolean; isPublic?: boolean }>>([]);
  const [isLoadingRxResumes, setIsLoadingRxResumes] = useState<boolean>(false);
  const [isSyncingResumeId, setIsSyncingResumeId] = useState<string | null>(null);
  const [rxSyncError, setRxSyncError] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);

  const showNotification = useCallback((msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, []);

  const fetchDatasets = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/content');
      if (!res.ok) {
        throw new Error('Failed to load datasets');
      }
      const data = await res.json();
      setDatasets(data.datasets || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching datasets';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRxResumes = useCallback(async (customKey?: string, customBase?: string) => {
    try {
      setIsLoadingRxResumes(true);
      setRxSyncError(null);

      const params = new URLSearchParams();
      const keyToUse = customKey !== undefined ? customKey : rxApiKey;
      const baseToUse = customBase !== undefined ? customBase : rxBaseUrl;

      if (keyToUse.trim()) params.set('apiKey', keyToUse.trim());
      if (baseToUse.trim() && baseToUse !== 'https://rxresu.me') params.set('baseUrl', baseToUse.trim());

      const url = `/api/v1/integrations/rxresume/sync${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch resumes from RxResume');
      }

      setRxResumes(data.resumes || []);
      setHasServerKey(!!data.hasServerKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching RxResume account';
      setRxSyncError(msg);
      setRxResumes([]);
    } finally {
      setIsLoadingRxResumes(false);
    }
  }, [rxApiKey, rxBaseUrl]);

  const handleSyncResume = async (resume: { id: string; title: string }, setAsPrimary = false) => {
    try {
      setIsSyncingResumeId(resume.id);
      setRxSyncError(null);

      const res = await fetch('/api/v1/integrations/rxresume/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resume.id,
          apiKey: rxApiKey.trim() || undefined,
          baseUrl: rxBaseUrl.trim() || undefined,
          datasetName: `${resume.title || 'RxResume'} (Synced ${new Date().toLocaleDateString()})`,
          setAsPrimary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync resume');
      }

      setIsSyncModalOpen(false);
      showNotification(`Successfully synced "${resume.title}" into Content Datasets!`);
      await fetchDatasets();
      if (data.dataset?.id) {
        router.push(`/admin/content/${data.dataset.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error syncing resume';
      setRxSyncError(msg);
    } finally {
      setIsSyncingResumeId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/api/v1/content');
        if (!res.ok) throw new Error('Failed to load datasets');
        const data = await res.json();
        if (isMounted) {
          setDatasets(data.datasets || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Error fetching datasets';
          setErrorMessage(msg);
        }
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
  }, []);

  const handleCreateEmptyDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDatasetName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDatasetName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create dataset');
      }

      const { dataset } = await res.json();
      setIsNewModalOpen(false);
      setNewDatasetName('');
      showNotification(`Dataset "${dataset.name}" created successfully.`);
      router.push(`/admin/content/${dataset.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create dataset';
      showNotification(msg, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakePrimary = async (datasetId: string, name: string) => {
    try {
      const res = await fetch(`/api/v1/content/${datasetId}/activate`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to activate dataset');
      }

      showNotification(`"${name}" is now set as the active primary profile dataset.`);
      fetchDatasets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error setting primary dataset';
      showNotification(msg, true);
    }
  };

  const handleDuplicate = async (datasetId: string) => {
    try {
      const res = await fetch(`/api/v1/content/${datasetId}/duplicate`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to duplicate dataset');
      }

      const { dataset } = await res.json();
      showNotification(`Dataset duplicated as "${dataset.name}".`);
      fetchDatasets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error duplicating dataset';
      showNotification(msg, true);
    }
  };

  const handleDeleteDataset = async (datasetId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/content/${datasetId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete dataset');
      }

      showNotification(`Dataset "${name}" deleted.`);
      setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting dataset';
      showNotification(msg, true);
    }
  };

  const handleExportJson = (dataset: DatasetMeta) => {
    const dataStr = JSON.stringify(dataset.rawJson || dataset, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // IMPORT & PARSER LOGIC
  // ============================================================

  const analyzeParsedJson = (json: Record<string, unknown>) => {
    try {
      let format: 'rxresume' | 'jsonresume' | 'unknown' = 'unknown';
      let candidateName = 'Imported Resume';
      let headline = '';
      let email = '';
      let phone = '';
      let location = '';
      let customFieldsCount = 0;
      let summarySnippet = '';
      const sectionSummaries: Array<{ type: string; title: string; count: number }> = [];

      // Check if RxResume format
      if (json.sections && typeof json.sections === 'object' && !Array.isArray(json.sections)) {
        format = 'rxresume';
        const b = (json.basics || {}) as Record<string, unknown>;
        candidateName = (b.name as string) || 'Yonatan Elias';
        headline = (b.headline as string) || '';
        email = (b.email as string) || '';
        phone = (b.phone as string) || '';
        location = (b.location as string) || '';
        if (Array.isArray(b.customFields)) {
          customFieldsCount = b.customFields.length;
        }

        const summaryObj = json.summary as { content?: string } | undefined;
        if (summaryObj?.content) {
          summarySnippet = summaryObj.content.replace(/<[^>]+>/g, '').slice(0, 150) + '...';
        }

        const secs = json.sections as Record<string, { title?: string; items?: unknown[] }>;
        Object.entries(secs).forEach(([key, val]) => {
          if (val && Array.isArray(val.items)) {
            sectionSummaries.push({
              type: key,
              title: val.title || key.charAt(0).toUpperCase() + key.slice(1),
              count: val.items.length,
            });
          }
        });
      } else if (json.basics && typeof json.basics === 'object') {
        // JSON Resume format
        format = 'jsonresume';
        const b = json.basics as Record<string, unknown>;
        candidateName = (b.name as string) || 'Imported Resume';
        headline = (b.label as string) || '';
        email = (b.email as string) || '';
        phone = (b.phone as string) || '';
        location = typeof b.location === 'string' ? b.location : '';
        if (typeof b.summary === 'string') {
          summarySnippet = b.summary.slice(0, 150) + '...';
        }

        const checkArr = (k: string, title: string) => {
          if (Array.isArray(json[k])) {
            sectionSummaries.push({ type: k, title, count: (json[k] as unknown[]).length });
          }
        };

        checkArr('work', 'Work Experience');
        checkArr('education', 'Education');
        checkArr('projects', 'Projects');
        checkArr('skills', 'Skills');
        checkArr('languages', 'Languages');
        checkArr('volunteer', 'Volunteer');
        checkArr('awards', 'Awards');
        checkArr('certificates', 'Certificates');
        checkArr('publications', 'Publications');
      } else {
        throw new Error('Unrecognized resume format. Expected Reactive Resume or JSON Resume schema.');
      }

      const defaultName = `${candidateName} — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

      setImportPreview({
        format,
        name: candidateName,
        basics: { name: candidateName, headline, email, phone, location, customFieldsCount },
        summarySnippet,
        sections: sectionSummaries,
        rawData: json,
      });

      setImportDatasetName(defaultName);
      setImportError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error parsing resume';
      setImportError(msg);
      setImportPreview(null);
    }
  };

  const processJsonFile = (file: File) => {
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        analyzeParsedJson(json);
      } catch {
        setImportError('Invalid JSON format. Please ensure the file contains valid JSON.');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        processJsonFile(file);
      } else {
        setImportError('Please upload a JSON file (.json).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processJsonFile(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      setImportError(null);
      const res = await fetch('/sample-cv.json');
      if (!res.ok) {
        throw new Error('Failed to load sample CV');
      }
      const json = await res.json();
      analyzeParsedJson(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading sample CV';
      setImportError(msg);
    }
  };

  const handleExecuteImport = async () => {
    if (!importPreview || !importDatasetName.trim()) return;

    try {
      setIsSubmitting(true);
      setImportError(null);

      const res = await fetch('/api/v1/content/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importDatasetName.trim(),
          type: importPreview.format === 'rxresume' ? 'rxresume' : 'jsonresume',
          data: importPreview.rawData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const { dataset } = await res.json();
      setIsImportModalOpen(false);
      setImportPreview(null);
      showNotification(`Resume successfully imported into dataset "${dataset.name}"!`);
      fetchDatasets();
      router.push(`/admin/content/${dataset.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import resume';
      setImportError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter datasets
  const filteredDatasets = datasets.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesName = d.name.toLowerCase().includes(q);
    const matchesSection = d.sectionTypes.some((t) => t.toLowerCase().includes(q));
    const matchesEmail = typeof d.basics?.email === 'string' && d.basics.email.toLowerCase().includes(q);
    return matchesName || matchesSection || matchesEmail;
  });

  return (
    <div className={styles.contentRoot}>
      {/* Notifications */}
      {successMessage && <div className={styles.alertSuccess}>✓ {successMessage}</div>}
      {errorMessage && <div className={styles.alertError}>⚠ {errorMessage}</div>}

      {/* Hero Header */}
      <section className={dashboardStyles.welcomeBanner}>
        <div>
          <h2 className={dashboardStyles.welcomeTitle}>Content Datasets & Resume Management</h2>
          <p className={dashboardStyles.welcomeSubtitle}>
            Import Reactive Resume / JSON Resume data, manage multiple resume variants, and configure polymorphic resume sections with rich markdown.
          </p>
        </div>
        <div className={dashboardStyles.bannerMeta}>
          <div className={dashboardStyles.bannerPill}>
            <span className={dashboardStyles.pulseDot} />
            <span>Phase 4 Active</span>
          </div>
        </div>
      </section>

      {/* Actions & Search Bar */}
      <div className={styles.actionBar}>
        <div className={styles.searchContainer}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search datasets, sections, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.syncButton}
            onClick={() => {
              setIsSyncModalOpen(true);
              fetchRxResumes();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Sync from RxResume
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              setImportPreview(null);
              setImportError(null);
              setIsImportModalOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import JSON File
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setNewDatasetName('');
              setIsNewModalOpen(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Empty Dataset
          </button>
        </div>
      </div>

      {/* Datasets Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <div className={dashboardStyles.loadingSpinner} style={{ margin: '0 auto 1rem' }} />
          Loading content datasets...
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className={dashboardStyles.sectionCard}>
          <div className={dashboardStyles.emptyState}>
            <div className={dashboardStyles.emptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h4 className={dashboardStyles.emptyTitle}>
              {searchQuery ? 'No matching datasets found' : 'No Content Datasets Yet'}
            </h4>
            <p className={dashboardStyles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search keyword or clear the search filter.'
                : 'Import your existing RxResume or JSON Resume file to immediately populate your personal profile.'}
            </p>
            {!searchQuery && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setIsImportModalOpen(true)}
                >
                  Import RxResume (.json)
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleLoadSample}
                >
                  Try Yonatan Elias CV Sample
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.datasetsGrid}>
          {filteredDatasets.map((ds) => (
            <div
              key={ds.id}
              className={`${styles.datasetCard} ${ds.isPrimary ? styles.datasetCardPrimary : ''}`}
            >
              <div>
                <div className={styles.datasetCardHeader}>
                  <div className={styles.datasetTitleGroup}>
                    <h3 className={styles.datasetName}>
                      {ds.name}
                      {ds.isPrimary && (
                        <span className={styles.primaryBadge}>
                          ★ Active Primary
                        </span>
                      )}
                    </h3>
                    <span className={styles.datasetSubtitle}>
                      Updated {new Date(ds.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className={styles.statsBar} style={{ marginTop: '1rem' }}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Sections</span>
                    <span className={styles.statValue}>{ds.sectionsCount}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Items</span>
                    <span className={styles.statValue}>{ds.itemsCount}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Format</span>
                    <span className={styles.statValue} style={{ fontSize: '0.85rem', color: '#60a5fa' }}>
                      {ds.rawJson ? 'RxResume' : 'Custom'}
                    </span>
                  </div>
                </div>

                {ds.sectionTypes && ds.sectionTypes.length > 0 && (
                  <div className={styles.sectionTags} style={{ marginTop: '1rem' }}>
                    {ds.sectionTypes.slice(0, 5).map((type, idx) => (
                      <span key={idx} className={styles.sectionPill}>
                        {type}
                      </span>
                    ))}
                    {ds.sectionTypes.length > 5 && (
                      <span className={styles.sectionPill} style={{ color: '#64748b' }}>
                        +{ds.sectionTypes.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.cardFooter}>
                <Link
                  href={`/admin/content/${ds.id}`}
                  className={styles.primaryButton}
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                >
                  Edit Sections
                </Link>

                <div className={styles.cardActions}>
                  {!ds.isPrimary && (
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Set as Primary Profile Dataset"
                      onClick={() => handleMakePrimary(ds.id, ds.name)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Duplicate Dataset"
                    onClick={() => handleDuplicate(ds.id)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Export JSON"
                    onClick={() => handleExportJson(ds)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                    title="Delete Dataset"
                    onClick={() => handleDeleteDataset(ds.id, ds.name)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================
          IMPORT RESUME MODAL
          ============================================================ */}
      {isImportModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => !isSubmitting && setIsImportModalOpen(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Import Resume Dataset</h3>
                <p className={styles.modalSubtitle}>
                  Supports Reactive Resume (v4/v5) and JSON Resume schema files.
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => !isSubmitting && setIsImportModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {importError && <div className={styles.alertError}>⚠ {importError}</div>}

            {/* Dropzone */}
            {!importPreview ? (
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                />

                <div className={styles.dropzoneIcon}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>

                <div>
                  <h4 className={styles.dropzoneTitle}>Drag & Drop your JSON resume file here</h4>
                  <p className={styles.dropzoneText}>or click to browse your computer</p>
                </div>

                <div className={styles.dropzoneActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={styles.sampleBadgeBtn}
                    onClick={handleLoadSample}
                  >
                    ✨ Quick Load: Yonatan Elias CV (RxResume Sample)
                  </button>
                </div>
              </div>
            ) : (
              /* Validation Preview */
              <div className={styles.previewContainer}>
                <div className={styles.previewHeader}>
                  <span className={styles.previewTitle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Resume Validation & Schema Preview
                  </span>
                  <span className={styles.formatBadge}>
                    {importPreview.format.toUpperCase()} DETECTED
                  </span>
                </div>

                <div className={styles.inputField}>
                  <label className={styles.inputLabel}>Dataset Name</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={importDatasetName}
                    onChange={(e) => setImportDatasetName(e.target.value)}
                    placeholder="e.g. Full-Stack Profile 2026"
                  />
                </div>

                <div className={styles.previewGrid}>
                  <div className={styles.previewBox}>
                    <div className={styles.previewBoxLabel}>Candidate Name</div>
                    <div className={styles.previewBoxValue}>{importPreview.basics.name || '—'}</div>
                  </div>
                  <div className={styles.previewBox}>
                    <div className={styles.previewBoxLabel}>Headline / Title</div>
                    <div className={styles.previewBoxValue}>{importPreview.basics.headline || '—'}</div>
                  </div>
                  <div className={styles.previewBox}>
                    <div className={styles.previewBoxLabel}>Email</div>
                    <div className={styles.previewBoxValue}>{importPreview.basics.email || '—'}</div>
                  </div>
                  <div className={styles.previewBox}>
                    <div className={styles.previewBoxLabel}>Location</div>
                    <div className={styles.previewBoxValue}>{importPreview.basics.location || '—'}</div>
                  </div>
                </div>

                {importPreview.summarySnippet && (
                  <div className={styles.previewBox}>
                    <div className={styles.previewBoxLabel}>Summary Preview</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                      {importPreview.summarySnippet}
                    </div>
                  </div>
                )}

                <div>
                  <div className={styles.previewBoxLabel} style={{ marginBottom: '0.5rem' }}>
                    Discovered Sections ({importPreview.sections.length})
                  </div>
                  <div className={styles.sectionTags}>
                    {importPreview.sections.map((sec, idx) => (
                      <span key={idx} className={styles.sectionPill}>
                        <strong>{sec.title}</strong>: {sec.count} items
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setImportPreview(null)}
                    disabled={isSubmitting}
                  >
                    Choose Different File
                  </button>

                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleExecuteImport}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Importing Dataset...' : 'Confirm & Create Dataset'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          NEW EMPTY DATASET MODAL
          ============================================================ */}
      {isNewModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => !isSubmitting && setIsNewModalOpen(false)}>
          <div className={styles.modalDialog} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>New Empty Dataset</h3>
                <p className={styles.modalSubtitle}>
                  Create a clean dataset to author resume sections manually.
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => !isSubmitting && setIsNewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmptyDataset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className={styles.inputField}>
                <label className={styles.inputLabel}>Dataset Name</label>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="e.g. Master Resume 2026"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsNewModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting || !newDatasetName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          SYNC FROM RXRESUME MODAL
          ============================================================ */}
      {isSyncModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => !isSyncingResumeId && setIsSyncModalOpen(false)}>
          <div className={styles.modalDialog} style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Sync from RxResume Cloud API
                </h3>
                <p className={styles.modalSubtitle}>
                  Fetch and import any resume directly from your Reactive Resume account using OpenAPI.
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => !isSyncingResumeId && setIsSyncModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {rxSyncError && <div className={styles.alertError}>⚠ {rxSyncError}</div>}

            {/* API Key configuration section */}
            <div className={styles.apiKeyContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.inputLabel} style={{ margin: 0 }}>
                  RxResume API Key
                  {hasServerKey && (
                    <span style={{ marginLeft: '0.5rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>
                      ✓ Server Key Active
                    </span>
                  )}
                </label>
                <a
                  href="https://rxresu.me/dashboard/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}
                >
                  Get API Key ↗
                </a>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="password"
                  className={styles.textInput}
                  style={{ flex: 1 }}
                  placeholder={hasServerKey ? 'Using server RXRESUME_API_KEY (or enter custom key)' : 'Enter your x-api-key here'}
                  value={rxApiKey}
                  onChange={(e) => setRxApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.primaryButton}
                  style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                  onClick={() => fetchRxResumes()}
                  disabled={isLoadingRxResumes}
                >
                  {isLoadingRxResumes ? 'Connecting...' : 'Fetch Resumes'}
                </button>
              </div>
            </div>

            {/* Discovered Resumes List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className={styles.inputLabel} style={{ margin: 0 }}>
                  Account Resumes {rxResumes.length > 0 && `(${rxResumes.length})`}
                </span>
                {isLoadingRxResumes && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Loading from RxResume...</span>
                )}
              </div>

              {isLoadingRxResumes ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                  <div className={dashboardStyles.loadingSpinner} style={{ margin: '0 auto 0.75rem' }} />
                  Connecting to RxResume OpenAPI...
                </div>
              ) : rxResumes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: '#94a3b8' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {hasServerKey || rxApiKey ? 'No resumes found in this RxResume account.' : 'Enter your RxResume API Key above and click "Fetch Resumes".'}
                  </p>
                </div>
              ) : (
                <div className={styles.syncCardsList}>
                  {rxResumes.map((resume) => (
                    <div key={resume.id} className={styles.syncCard}>
                      <div className={styles.syncCardInfo}>
                        <div className={styles.syncCardTitle}>
                          <span>{resume.title || 'Untitled Resume'}</span>
                          {resume.isPublic && (
                            <span className={`${styles.syncCardBadge} ${styles.syncCardBadgePublic}`}>Public</span>
                          )}
                          {resume.isLocked && (
                            <span className={`${styles.syncCardBadge} ${styles.syncCardBadgeLocked}`}>Locked</span>
                          )}
                        </div>
                        <div className={styles.syncCardMeta}>
                          <span className={styles.syncCardSlug}>/{resume.slug || resume.id.slice(0, 8)}</span>
                          {resume.updatedAt && (
                            <span>Updated: {new Date(resume.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.primaryButton}
                        style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        onClick={() => handleSyncResume(resume)}
                        disabled={!!isSyncingResumeId}
                      >
                        {isSyncingResumeId === resume.id ? (
                          'Importing...'
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>1-Click Import</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsSyncModalOpen(false)}
                disabled={!!isSyncingResumeId}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
