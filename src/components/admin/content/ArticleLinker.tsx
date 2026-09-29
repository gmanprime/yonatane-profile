'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './articleLinker.module.css';

export interface LinkedArticleInfo {
  linkId: string;
  portfolioItemId: string;
  title?: string;
  subtitle?: string | null;
  coverImageUrl?: string | null;
  status?: string;
  isPrimary: boolean;
  displayOrder: number;
}

interface PortfolioItemSummary {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  coverImageUrl: string | null;
}

interface ArticleLinkerProps {
  sectionItemId: string;
  itemName?: string;
}

export const ArticleLinker: React.FC<ArticleLinkerProps> = ({
  sectionItemId,
  itemName,
}) => {
  const [links, setLinks] = useState<LinkedArticleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [allArticles, setAllArticles] = useState<PortfolioItemSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load linked articles for this section item
  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/projects/${sectionItemId}/articles`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (err) {
      console.error('Failed to load linked articles:', err);
    } finally {
      setLoading(false);
    }
  }, [sectionItemId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Load all portfolio articles when modal opens
  const openModal = async () => {
    setModalOpen(true);
    setSearchQuery('');
    try {
      const res = await fetch('/api/v1/portfolio?limit=100');
      if (res.ok) {
        const data = await res.json();
        setAllArticles(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load portfolio articles for picker:', err);
    }
  };

  const handleLinkArticle = async (portfolioItemId: string) => {
    try {
      setActionLoading(true);
      const isPrimary = links.length === 0;
      const res = await fetch(`/api/v1/projects/${sectionItemId}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioItemId, isPrimary }),
      });
      if (res.ok) {
        await loadLinks();
        setModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to link article:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkArticle = async (portfolioItemId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/projects/${sectionItemId}/articles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioItemId }),
      });
      if (res.ok) {
        await loadLinks();
      }
    } catch (err) {
      console.error('Failed to unlink article:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const linkedIds = new Set(links.map((l) => l.portfolioItemId));

  const filteredArticles = allArticles.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.linkerRoot}>
      <div className={styles.linkerHeader}>
        <div className={styles.linkerTitleArea}>
          <span className={styles.linkerIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </span>
          <span className={styles.linkerLabel}>Linked Portfolio Articles</span>
          {links.length > 0 && (
            <span className={styles.linkerBadge}>{links.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={openModal}
          className={styles.linkAddBtn}
          disabled={actionLoading}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Link Article</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading linked articles...</div>
      ) : links.length === 0 ? (
        <div className={styles.emptyState}>
          <span>No portfolio articles linked to this item.</span>
        </div>
      ) : (
        <div className={styles.articlesList}>
          {links.map((link) => (
            <div key={link.linkId} className={styles.articleCard}>
              <div className={styles.articleInfo}>
                <span className={styles.articleTitle}>
                  {link.title || 'Untitled Article'}
                </span>
                {link.isPrimary && (
                  <span className={styles.primaryPill}>Primary</span>
                )}
                <span
                  className={`${styles.statusPill} ${link.status === 'published' ? styles.publishedPill : styles.draftPill}`}
                >
                  {link.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className={styles.articleActions}>
                <Link
                  href={`/admin/portfolio/${link.portfolioItemId}`}
                  className={styles.viewArticleBtn}
                  target="_blank"
                >
                  Edit Article ↗
                </Link>
                <button
                  type="button"
                  onClick={() => handleUnlinkArticle(link.portfolioItemId)}
                  className={styles.unlinkBtn}
                  title="Unlink Article"
                  disabled={actionLoading}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Picker Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                Link Article to {itemName || 'Project'}
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={styles.modalCloseBtn}
              >
                ×
              </button>
            </div>

            <div className={styles.modalSearch}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title..."
                className={styles.searchInput}
                autoFocus
              />
            </div>

            <div className={styles.modalList}>
              {filteredArticles.length === 0 ? (
                <div className={styles.emptyState}>No articles found.</div>
              ) : (
                filteredArticles.map((art) => {
                  const isAlreadyLinked = linkedIds.has(art.id);
                  return (
                    <div
                      key={art.id}
                      className={`${styles.modalItem} ${isAlreadyLinked ? styles.modalItemLinked : ''}`}
                      onClick={() => {
                        if (!isAlreadyLinked && !actionLoading) {
                          handleLinkArticle(art.id);
                        }
                      }}
                    >
                      <div className={styles.modalItemInfo}>
                        <div className={styles.modalItemTitle}>{art.title}</div>
                        {art.subtitle && (
                          <div className={styles.modalItemSubtitle}>{art.subtitle}</div>
                        )}
                      </div>
                      <div>
                        {isAlreadyLinked ? (
                          <span className={styles.statusPill}>Already Linked</span>
                        ) : (
                          <span
                            className={`${styles.statusPill} ${art.status === 'published' ? styles.publishedPill : styles.draftPill}`}
                          >
                            {art.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={styles.modalCancelBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
