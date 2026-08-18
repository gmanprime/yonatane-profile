'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PortfolioCard, type PortfolioArticleCardData } from './PortfolioCard';
import styles from './portfolio.module.css';

interface PortfolioGalleryProps {
  articles: PortfolioArticleCardData[];
  authorName?: string;
  hash?: string;
}

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  articles,
  authorName = 'Yonatan Elias',
  hash,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags with count
  const allTags = useMemo(() => {
    const tagCountMap = new Map<string, number>();
    for (const art of articles) {
      if (art.tags && Array.isArray(art.tags)) {
        for (const t of art.tags) {
          const lower = t.toLowerCase();
          tagCountMap.set(lower, (tagCountMap.get(lower) || 0) + 1);
        }
      }
    }
    return Array.from(tagCountMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  // Filter articles based on search query and active tag
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch =
        !searchTerm.trim() ||
        art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (art.subtitle && art.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (art.markdownBody && art.markdownBody.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (art.tags && art.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesTag =
        !selectedTag ||
        (art.tags && art.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }, [articles, searchTerm, selectedTag]);

  const homeHref = hash && hash !== 'default' ? `/p/${hash}` : '/';

  return (
    <div className={styles.galleryContainer}>
      {/* Header */}
      <header className={styles.galleryHeader}>
        <Link href={homeHref} className={styles.backHomeLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back to {authorName}&apos;s Profile</span>
        </Link>

        <h1 className={styles.galleryTitle}>Engineering Case Studies & Portfolio</h1>
        <p className={styles.gallerySubtitle}>
          Deep-dives into distributed system architectures, open-source projects, performance benchmarks, and real-world engineering solutions.
        </p>

        {/* Search & Tag Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchInputWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search case studies, topics, tech..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {allTags.length > 0 && (
            <div className={styles.tagsFilterList}>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={`${styles.tagFilterBtn} ${selectedTag === null ? styles.tagFilterBtnActive : ''}`}
              >
                All ({articles.length})
              </button>
              {allTags.slice(0, 8).map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`${styles.tagFilterBtn} ${selectedTag === tag ? styles.tagFilterBtnActive : ''}`}
                >
                  #{tag} ({count})
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Articles Grid */}
      {filteredArticles.length > 0 ? (
        <div className={styles.articlesGrid}>
          {filteredArticles.map((article) => (
            <PortfolioCard key={article.id} article={article} hash={hash} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', color: 'var(--theme-muted)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--theme-text)' }}>
            No case studies found
          </h3>
          <p style={{ fontSize: '0.9rem' }}>
            {searchTerm || selectedTag
              ? 'Try changing your search keywords or resetting active tag filters.'
              : 'No articles have been published yet.'}
          </p>
          {(searchTerm || selectedTag) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedTag(null);
              }}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                background: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-accent)',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
