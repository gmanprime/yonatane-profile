'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './portfolio.module.css';

interface LinkedProjectItem {
  id: string;
  data: {
    name?: string;
    title?: string;
    description?: string;
  };
}

interface PortfolioArticle {
  id: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
  markdownBody: string | null;
  tags: string[];
  links: { label: string; url: string }[];
  projectItemId: string | null;
  projectItem?: LinkedProjectItem | null;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATES = [
  {
    id: 'case-study',
    title: 'Deep-Dive Technical Case Study',
    description: 'System architecture, problem statement, key trade-offs & benchmark metrics.',
    starterBody: `# Architecture & Engineering Breakdown

## 1. Problem Statement & Motivation
Describe the high-scale engineering challenges, throughput requirements, or architectural bottlenecks encountered.

> [!NOTE]
> Key Objective: Deliver high-reliability, low-latency microservices with zero downtime during failover.

## 2. System Architecture & Component Design
Explain how the system operates, including data models, message buses, and cache hierarchies.

\`\`\`typescript
// Distributed cache coordinator sample
export class CacheCoordinator {
  private readonly clusterNodes = new Set<string>();
  
  async sync(key: string, data: Record<string, unknown>): Promise<void> {
    // Multi-region invalidated broadcast
  }
}
\`\`\`

## 3. Key Technical Decisions & Benchmarks
| Component | Technology | Throughput (req/s) | p99 Latency |
|:---|:---|:---|:---|
| Primary API | Next.js / Edge | 25,000 | 12ms |
| Relational Storage | PostgreSQL + Drizzle | 8,500 | 4ms |
| Cache Layer | Redis Cluster | 85,000 | 0.8ms |

## 4. Key Learnings & Production Takeaways
- Emphasize automated resilience testing.
- Implement strict schema contracts early across microservices.
`,
  },
  {
    id: 'architecture',
    title: 'Open-Source Project Breakdown',
    description: 'RFC decisions, library design, usage examples & developer ergonomics.',
    starterBody: `# Open-Source Project Release

## Executive Overview
A brief summary of what this tool does and why it was created for the open-source community.

> [!TIP]
> Quick Install: \`npm install @yonatan/stealth-core\`

## Core API & Usage
Demonstrate clean developer ergonomics and TypeScript type safety.

\`\`\`typescript
import { createStealthHarness } from '@yonatan/stealth-core';

const harness = createStealthHarness({
  stealthCookie: 'x-profile-session',
  telemetry: true,
});
\`\`\`

## Feature Highlights
- **Zero Configuration**: Sensible defaults with instant DX.
- **Type-Safe**: Full compile-time schema validation with Zod.
- **Ultra Lightweight**: Zero runtime external dependencies.
`,
  },
  {
    id: 'postmortem',
    title: 'Engineering Milestone / RCA',
    description: 'Technical postmortem, incident timeline, root cause analysis & guardrails.',
    starterBody: `# Engineering Postmortem & System Hardening

## Summary
- **Impact Duration**: 18 minutes
- **Root Cause**: Database connection pool exhaustion during sudden burst traffic.
- **Resolution**: Implemented pgbouncer multiplexing and dynamic client pooling.

> [!WARNING]
> High Priority: Never allow unbounded connection pools in serverless runtime environments.

## Incident Timeline
1. **14:02 UTC**: Telemetry alert triggered on p99 API response degradation.
2. **14:08 UTC**: Connection pool saturation identified on master database.
3. **14:15 UTC**: Hotfix deployed with client limit clamping and connection pooling proxy.
4. **14:20 UTC**: All telemetry metrics returned to nominal baselines.

## Preventive Measures & Guardrails
- [x] Deployed PgBouncer connection multiplexer.
- [x] Configured aggressive timeout alarms and automatic circuit breakers.
`,
  },
  {
    id: 'blank',
    title: 'Blank Canvas',
    description: 'Start with an empty markdown workspace for bespoke articles.',
    starterBody: '',
  },
];

export default function AdminPortfolioPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<PortfolioArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Quick Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('case-study');
  const [initialStatus, setInitialStatus] = useState<'draft' | 'published'>('draft');
  const [creating, setCreating] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PortfolioArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArticles = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/v1/portfolio');
      if (!res.ok) {
        throw new Error('Failed to load articles');
      }
      const data = await res.json();
      setArticles(data.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/api/v1/portfolio');
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setArticles(data.items || []);
        } else {
          setError('Failed to load articles');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Error loading articles');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute stats
  const totalArticles = articles.length;
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const linkedProjectsCount = articles.filter((a) => !!a.projectItemId).length;

  // Extract unique tags across all articles
  const allTags = Array.from(
    new Set(articles.flatMap((a) => a.tags || []))
  ).filter(Boolean);

  // Filtered list
  const filteredArticles = articles.filter((art) => {
    // Status filter
    if (statusFilter !== 'all' && art.status !== statusFilter) {
      return false;
    }
    // Tag filter
    if (tagFilter !== 'all' && !(art.tags || []).includes(tagFilter)) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = art.title.toLowerCase().includes(q);
      const matchSubtitle = art.subtitle?.toLowerCase().includes(q);
      const matchBody = art.markdownBody?.toLowerCase().includes(q);
      const matchTags = (art.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSubtitle && !matchBody && !matchTags) {
        return false;
      }
    }
    return true;
  });

  // Handle Quick Create
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Please enter an article title');
      return;
    }

    setCreating(true);
    try {
      const chosenTemplate = TEMPLATES.find((t) => t.id === selectedTemplate);
      const starterMarkdown = chosenTemplate ? chosenTemplate.starterBody : '';

      const payload = {
        title: newTitle.trim(),
        subtitle: newSubtitle.trim() || null,
        markdownBody: starterMarkdown,
        status: initialStatus,
        tags: selectedTemplate === 'case-study' ? ['Architecture', 'Case Study'] : ['Technical'],
        publishedAt: initialStatus === 'published' ? new Date().toISOString() : null,
      };

      const res = await fetch('/api/v1/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create article');
      }

      setCreateModalOpen(false);
      setNewTitle('');
      setNewSubtitle('');
      router.push(`/admin/portfolio/${data.item.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/portfolio/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchArticles();
      } else {
        const data = await res.json();
        alert(data.error || 'Duplicate failed');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/portfolio/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        await fetchArticles();
      } else {
        const data = await res.json();
        alert(data.error || 'Delete failed');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.dashboardRoot}>
      {/* Welcome Banner */}
      <section className={styles.welcomeBanner}>
        <div>
          <h2 className={styles.welcomeTitle}>Portfolio Articles & Blog CMS</h2>
          <p className={styles.welcomeSubtitle}>
            Author, edit, and publish deep-dive technical articles, project case studies, and engineering breakdowns with rich Markdown, GitHub callouts, and live preview.
          </p>
        </div>
        <div className={styles.bannerActions}>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setCreateModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Article</span>
          </button>
        </div>
      </section>

      {/* High-Level KPI Metric Cards */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.iconBlue}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiValue}>{totalArticles}</span>
            <span className={styles.kpiLabel}>Total Articles</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.iconEmerald}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiValue}>{publishedCount}</span>
            <span className={styles.kpiLabel}>Published Live</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.iconAmber}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiValue}>{draftCount}</span>
            <span className={styles.kpiLabel}>Drafts in Progress</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.iconPurple}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiValue}>{linkedProjectsCount}</span>
            <span className={styles.kpiLabel}>Linked to Projects</span>
          </div>
        </div>
      </section>

      {/* Filter & Control Bar */}
      <section className={styles.controlBar}>
        <div className={styles.filterLeft}>
          {/* Live Search Input */}
          <div className={styles.searchBox}>
            <div className={styles.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles by title, tag, or content..."
              className={styles.searchInput}
            />
          </div>

          {/* Status Filter Pills */}
          <div className={styles.statusPills}>
            <button
              type="button"
              className={`${styles.statusFilterBtn} ${statusFilter === 'all' ? styles.statusFilterActive : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({totalArticles})
            </button>
            <button
              type="button"
              className={`${styles.statusFilterBtn} ${statusFilter === 'published' ? styles.statusFilterActive : ''}`}
              onClick={() => setStatusFilter('published')}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              className={`${styles.statusFilterBtn} ${statusFilter === 'draft' ? styles.statusFilterActive : ''}`}
              onClick={() => setStatusFilter('draft')}
            >
              Drafts ({draftCount})
            </button>
          </div>

          {/* Tag Filter Dropdown */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className={styles.tagFilterSelect}
            >
              <option value="all">All Tags ({allTags.length})</option>
              {allTags.map((t, idx) => (
                <option key={idx} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* View Switcher (Grid vs Table) */}
        <div className={styles.viewModeToggle}>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
            title="Card Grid View"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('table')}
            title="Compact Table View"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </section>

      {/* Articles Content Section */}
      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <div
              style={{
                width: 24,
                height: 24,
                border: '2px solid rgba(56, 189, 248, 0.2)',
                borderTopColor: '#38bdf8',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
          <h4 className={styles.emptyTitle}>Loading portfolio articles...</h4>
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <h4 className={styles.emptyTitle} style={{ color: '#f87171' }}>
            Failed to load articles
          </h4>
          <p className={styles.emptySubtitle}>{error}</p>
          <button type="button" onClick={fetchArticles} className={styles.createBtn}>
            Retry
          </button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h4 className={styles.emptyTitle}>No articles found</h4>
          <p className={styles.emptySubtitle}>
            {searchQuery || statusFilter !== 'all' || tagFilter !== 'all'
              ? 'Try clearing your search query or filters to see more articles.'
              : 'Create your first portfolio article or engineering case study to showcase your work.'}
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className={styles.createBtn}
            style={{ marginTop: '0.5rem' }}
          >
            + Create First Article
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <section className={styles.articlesGrid}>
          {filteredArticles.map((art) => {
            const wordCount = (art.markdownBody || '').trim().split(/\s+/).filter(Boolean).length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));
            const projectName =
              art.projectItem?.data?.name || art.projectItem?.data?.title;

            return (
              <div key={art.id} className={styles.articleCard}>
                {/* Thumbnail Frame */}
                <div className={styles.cardThumbnailFrame}>
                  {art.coverImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={art.coverImageUrl} alt={art.title} className={styles.cardImg} />
                  ) : (
                    <div className={styles.cardPlaceholder}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={styles.cardBadgeTop}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: art.status === 'published' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                        color: '#ffffff',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {art.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{art.title}</h3>
                  {art.subtitle && <p className={styles.cardSubtitle}>{art.subtitle}</p>}

                  {projectName && (
                    <div className={styles.cardProjectLink}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Linked: {projectName}</span>
                    </div>
                  )}

                  {art.tags && art.tags.length > 0 && (
                    <div className={styles.cardTags}>
                      {art.tags.map((t, idx) => (
                        <span key={idx} className={styles.tagPill}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className={styles.cardFooter}>
                  <span>
                    {readingTime} min read •{' '}
                    {new Date(art.updatedAt || art.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(art.id)}
                      className={styles.actionIconBtn}
                      title="Duplicate article"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(art)}
                      className={styles.actionIconBtn}
                      title="Delete article"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    <Link href={`/admin/portfolio/${art.id}`} className={styles.editCardBtn}>
                      Edit Studio →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        /* Table List View */
        <section className={styles.tableContainer}>
          <table className={styles.articlesTable}>
            <thead>
              <tr>
                <th>Article Title</th>
                <th>Status</th>
                <th>Linked Project</th>
                <th>Tags</th>
                <th>Reading Time</th>
                <th>Updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((art) => {
                const wordCount = (art.markdownBody || '').trim().split(/\s+/).filter(Boolean).length;
                const readingTime = Math.max(1, Math.ceil(wordCount / 200));
                const projectName =
                  art.projectItem?.data?.name || art.projectItem?.data?.title;

                return (
                  <tr key={art.id}>
                    <td>
                      <div className={styles.tableTitleCol}>
                        {art.coverImageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={art.coverImageUrl} alt={art.title} className={styles.tableThumb} />
                        ) : (
                          <div className={styles.tableThumbPlaceholder}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <Link href={`/admin/portfolio/${art.id}`} className={styles.tableTitleText}>
                            {art.title}
                          </Link>
                          {art.subtitle && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {art.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          background: art.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: art.status === 'published' ? '#34d399' : '#fbbf24',
                          border: art.status === 'published' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {art.status === 'published' ? '● Published' : '○ Draft'}
                      </span>
                    </td>
                    <td>
                      {projectName ? (
                        <span style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{projectName}</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {(art.tags || []).slice(0, 3).map((t, idx) => (
                          <span key={idx} className={styles.tagPill}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8' }}>~{readingTime} min</td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {new Date(art.updatedAt || art.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(art.id)}
                          className={styles.actionIconBtn}
                          title="Duplicate article"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(art)}
                          className={styles.actionIconBtn}
                          title="Delete article"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                        <Link href={`/admin/portfolio/${art.id}`} className={styles.editCardBtn}>
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Quick Create Article Modal */}
      {createModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setCreateModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateArticle}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>Create New Portfolio Article</h3>
                  <p className={styles.modalSubtitle}>
                    Select a starter template and enter article details to open the Markdown Studio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className={styles.closeBtn}
                >
                  ×
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Article Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Building High-Throughput Edge Caching Systems"
                    className={styles.input}
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Subtitle / Summary</label>
                  <input
                    type="text"
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    placeholder="A concise description of the architectural or engineering topic..."
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Choose Starter Template</label>
                  <div className={styles.templateGrid}>
                    {TEMPLATES.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className={`${styles.templateCard} ${selectedTemplate === tmpl.id ? styles.templateCardSelected : ''}`}
                        onClick={() => setSelectedTemplate(tmpl.id)}
                      >
                        <h4 className={styles.templateTitle}>{tmpl.title}</h4>
                        <p className={styles.templateDesc}>{tmpl.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Initial Publication Status</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="initialStatus"
                        checked={initialStatus === 'draft'}
                        onChange={() => setInitialStatus('draft')}
                      />
                      <span>Draft (Private)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="initialStatus"
                        checked={initialStatus === 'published'}
                        onChange={() => setInitialStatus('published')}
                      />
                      <span>Publish Immediately</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className={styles.submitBtn}>
                  {creating ? 'Creating...' : 'Open in Editor Studio →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: 450 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f87171' }}>Delete Article</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                Are you sure you want to permanently delete <strong>&ldquo;{deleteTarget.title}&rdquo;</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className={styles.submitBtn}
                  style={{ background: '#ef4444' }}
                >
                  {deleting ? 'Deleting...' : 'Delete Article'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
