'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './editor.module.css';
import { MarkdownPreview } from '@/components/admin/portfolio/MarkdownPreview';
import { MarkdownToolbar, type EditorViewMode } from '@/components/admin/portfolio/MarkdownToolbar';
import { TagManager } from '@/components/admin/portfolio/TagManager';
import { ExternalLinksManager, type ExternalLinkItem } from '@/components/admin/portfolio/ExternalLinksManager';
import { ProjectLinker } from '@/components/admin/portfolio/ProjectLinker';
import { CoverImageManager } from '@/components/admin/portfolio/CoverImageManager';

interface ArticleData {
  id: string;
  title: string;
  subtitle: string;
  coverImageUrl: string | null;
  markdownBody: string;
  tags: string[];
  links: ExternalLinkItem[];
  projectItemId: string | null;
  status: 'draft' | 'published';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ArticleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const articleId = resolvedParams.id;
  const router = useRouter();

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Editor states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [markdownBody, setMarkdownBody] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [links, setLinks] = useState<ExternalLinkItem[]>([]);
  const [projectItemId, setProjectItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  // View Mode & Modals
  const [viewMode, setViewMode] = useState<EditorViewMode>('split');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mark dirty on changes
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Save handler
  const handleSave = React.useCallback(
    async (overrideStatus?: 'draft' | 'published') => {
      if (!title.trim()) {
        alert('Article title is required before saving.');
        return;
      }

      const currentStatus = overrideStatus || status;

      setSaving(true);
      setError(null);

      try {
        const payload = {
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          markdownBody,
          coverImageUrl: coverImageUrl || null,
          tags,
          links,
          projectItemId: projectItemId || null,
          status: currentStatus,
          publishedAt:
            currentStatus === 'published'
              ? publishedAt
                ? new Date(publishedAt).toISOString()
                : new Date().toISOString()
              : null,
        };

        const res = await fetch(`/api/v1/portfolio/${articleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to save article');
        }

        setArticle(data.item);
        setStatus(currentStatus);
        setIsDirty(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save article');
      } finally {
        setSaving(false);
      }
    },
    [articleId, title, subtitle, markdownBody, coverImageUrl, tags, links, projectItemId, status, publishedAt]
  );

  // Load article data
  useEffect(() => {
    let isMounted = true;
    async function loadArticle() {
      try {
        const res = await fetch(`/api/v1/portfolio/${articleId}`);
        if (!isMounted) return;
        if (!res.ok) {
          throw new Error('Failed to load article');
        }
        const data = await res.json();
        const it = data.item;
        setArticle(it);
        setTitle(it.title || '');
        setSubtitle(it.subtitle || '');
        setMarkdownBody(it.markdownBody || '');
        setCoverImageUrl(it.coverImageUrl || null);
        setTags(it.tags || []);
        setLinks(it.links || []);
        setProjectItemId(it.projectItemId || null);
        setStatus(it.status || 'draft');
        setPublishedAt(it.publishedAt ? new Date(it.publishedAt).toISOString().split('T')[0] : null);
        setIsDirty(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Error loading article');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadArticle();
    return () => {
      isMounted = false;
    };
  }, [articleId]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Calculate live telemetry
  const wordCount = markdownBody.trim() ? markdownBody.trim().split(/\s+/).length : 0;
  const charCount = markdownBody.length;
  const paragraphCount = markdownBody
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Toolbar insertion handler
  const handleInsertToolbar = (
    prefix: string,
    suffix: string = '',
    defaultPlaceholder: string = ''
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || defaultPlaceholder;

    const newText =
      currentText.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      currentText.substring(end);

    setMarkdownBody(newText);
    markDirty();

    // Preserve cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Delete handler
  const handleDelete = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/portfolio/${articleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/admin/portfolio');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete article');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.editorStudioRoot} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className={styles.dirtyDot} style={{ width: 14, height: 14 }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading article studio...</p>
        </div>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className={styles.editorStudioRoot} style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ color: '#f87171' }}>Error loading article</h3>
        <p style={{ color: '#94a3b8', margin: '1rem 0' }}>{error}</p>
        <Link href="/admin/portfolio" className={styles.secondaryBtn}>
          ← Back to Portfolio Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.editorStudioRoot}>
      {/* Top Sticky Navigation */}
      <header className={styles.topNav}>
        <div className={styles.topLeft}>
          <Link href="/admin/portfolio" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Articles</span>
          </Link>
          <div className={styles.titleArea}>
            <h2 className={styles.pageHeading}>{title || 'Untitled Article'}</h2>
            <span
              className={`${styles.topStatusPill} ${status === 'published' ? styles.publishedPill : styles.draftPill}`}
            >
              {status === 'published' ? '● Published' : '○ Draft'}
            </span>
          </div>
        </div>

        <div className={styles.topRight}>
          <button
            type="button"
            className={`${styles.topBtn} ${styles.previewTopBtn}`}
            onClick={() => setShowFullPreview(true)}
            title="Preview Full Reader Modal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preview Mode</span>
          </button>
          <button
            type="button"
            className={`${styles.topBtn} ${styles.deleteTopBtn}`}
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete Article"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace Grid */}
      <div className={styles.workspaceLayout}>
        {/* Left Metadata & Asset Sidebar */}
        <aside className={styles.metaSidebar}>
          {/* Article Core Metadata Card */}
          <div className={styles.metaSection}>
            <h3 className={styles.metaSectionTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Article Details</span>
            </h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Article Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                placeholder="e.g. Distributed System Architecture & Caching"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Subtitle / Summary</label>
              <textarea
                value={subtitle}
                onChange={(e) => {
                  setSubtitle(e.target.value);
                  markDirty();
                }}
                placeholder="A concise summary or hook for this technical article..."
                className={styles.textarea}
              />
            </div>

            {/* Publication State Switch */}
            <div className={styles.statusSwitchRow}>
              <div className={styles.statusInfo}>
                <span className={styles.statusLabel}>
                  {status === 'published' ? 'Published' : 'Draft Mode'}
                </span>
                <span className={styles.statusDesc}>
                  {status === 'published' ? 'Visible to portfolio visitors' : 'Private and unlisted'}
                </span>
              </div>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={status === 'published'}
                  onChange={(e) => {
                    const newStatus = e.target.checked ? 'published' : 'draft';
                    setStatus(newStatus);
                    markDirty();
                  }}
                />
                <span className={styles.slider} />
              </label>
            </div>

            {status === 'published' && (
              <div className={styles.formGroup} style={{ marginTop: '0.85rem' }}>
                <label className={styles.label}>Publication Date</label>
                <input
                  type="date"
                  value={publishedAt || ''}
                  onChange={(e) => {
                    setPublishedAt(e.target.value);
                    markDirty();
                  }}
                  className={styles.input}
                />
              </div>
            )}
          </div>

          {/* Cover Image Manager */}
          <div className={styles.metaSection}>
            <CoverImageManager
              coverImageUrl={coverImageUrl}
              onChange={(url) => {
                setCoverImageUrl(url);
                markDirty();
              }}
            />
          </div>

          {/* Tags Manager */}
          <div className={styles.metaSection}>
            <TagManager
              tags={tags}
              onChange={(newTags) => {
                setTags(newTags);
                markDirty();
              }}
            />
          </div>

          {/* Project Linker */}
          <div className={styles.metaSection}>
            <ProjectLinker
              selectedProjectItemId={projectItemId}
              onChange={(id) => {
                setProjectItemId(id);
                markDirty();
              }}
            />
          </div>

          {/* External Links */}
          <div className={styles.metaSection}>
            <ExternalLinksManager
              links={links}
              onChange={(newLinks) => {
                setLinks(newLinks);
                markDirty();
              }}
            />
          </div>
        </aside>

        {/* Center/Right Content Workspace */}
        <main className={styles.contentArea}>
          {/* Markdown Formatting Toolbar & Telemetry Bar */}
          <MarkdownToolbar
            onInsert={handleInsertToolbar}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            wordCount={wordCount}
            charCount={charCount}
            paragraphCount={paragraphCount}
            readingTimeMinutes={readingTimeMinutes}
          />

          {/* Split Pane / Full Pane Area */}
          <div className={styles.splitPaneContainer}>
            {/* Markdown Source Editor */}
            {(viewMode === 'split' || viewMode === 'editor') && (
              <div
                className={`${styles.paneEditor} ${viewMode === 'editor' ? styles.fullWidthPane : ''}`}
              >
                <textarea
                  ref={textareaRef}
                  value={markdownBody}
                  onChange={(e) => {
                    setMarkdownBody(e.target.value);
                    markDirty();
                  }}
                  placeholder="# Enter your markdown article content here...&#10;&#10;Use headings, code blocks, GitHub callouts, and tables to craft deep technical write-ups."
                  className={styles.editorTextarea}
                  spellCheck={false}
                />
              </div>
            )}

            {/* Live Markdown Preview */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div
                className={`${styles.panePreview} ${viewMode === 'preview' ? styles.fullWidthPane : ''}`}
              >
                <MarkdownPreview
                  content={markdownBody}
                  title={title}
                  subtitle={subtitle}
                  coverImageUrl={coverImageUrl}
                  tags={tags}
                  publishedAt={publishedAt}
                  status={status}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Sticky Bottom Action Footer */}
      <footer className={styles.actionFooter}>
        <div className={styles.dirtyStatus}>
          {isDirty ? (
            <>
              <span className={styles.dirtyDot} />
              <span>Unsaved changes in workspace (Press Ctrl+S to save)</span>
            </>
          ) : (
            <>
              <span className={styles.savedDot} />
              <span style={{ color: '#94a3b8' }}>All changes saved</span>
            </>
          )}
        </div>

        <div className={styles.footerActions}>
          {status === 'draft' ? (
            <>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className={styles.secondaryBtn}
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave('published')}
                disabled={saving}
                className={styles.primaryBtn}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
                <span>{saving ? 'Publishing...' : 'Publish Article'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving}
                className={styles.secondaryBtn}
              >
                Unpublish to Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave('published')}
                disabled={saving}
                className={styles.primaryBtn}
              >
                <span>{saving ? 'Saving...' : 'Save & Update'}</span>
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Full Screen Live Preview Reader Modal */}
      {showFullPreview && (
        <div className={styles.previewModalOverlay} onClick={() => setShowFullPreview(false)}>
          <div className={styles.previewModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={styles.topStatusPill} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  Live Article Preview
                </span>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {readingTimeMinutes} min read • {wordCount} words
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFullPreview(false)}
                className={styles.secondaryBtn}
                style={{ padding: '0.25rem 0.65rem' }}
              >
                Close Preview
              </button>
            </div>
            <div className={styles.previewModalBody}>
              <MarkdownPreview
                content={markdownBody}
                title={title}
                subtitle={subtitle}
                coverImageUrl={coverImageUrl}
                tags={tags}
                publishedAt={publishedAt}
                status={status}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.previewModalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div
            className={styles.previewModalContent}
            style={{ maxWidth: 450, height: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.previewModalHeader}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#f87171' }}>Delete Article</h3>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                Are you sure you want to permanently delete <strong>&ldquo;{title}&rdquo;</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className={styles.secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className={styles.primaryBtn}
                  style={{ background: '#ef4444' }}
                >
                  {saving ? 'Deleting...' : 'Delete Article'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
