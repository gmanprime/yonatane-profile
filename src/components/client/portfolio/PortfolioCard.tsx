'use client';

import React from 'react';
import Link from 'next/link';
import styles from './portfolio.module.css';

export interface PortfolioArticleCardData {
  id: string;
  title: string;
  subtitle?: string | null;
  coverImageUrl?: string | null;
  markdownBody?: string | null;
  tags?: string[] | null;
  publishedAt?: string | Date | null;
  projectItem?: {
    id: string;
    data?: unknown;
  } | null;
}

interface PortfolioCardProps {
  article: PortfolioArticleCardData;
  hash?: string;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ article, hash }) => {
  const { id, title, subtitle, coverImageUrl, markdownBody, tags = [], publishedAt, projectItem } = article;

  // Calculate estimated reading time
  const wordCount = (markdownBody || '').trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const projectData = (projectItem?.data as Record<string, unknown>) || null;
  const projectName = projectData
    ? (projectData.name as string) || (projectData.title as string) || null
    : null;

  const articleHref = hash && hash !== 'default' ? `/p/${hash}/blog/${id}` : `/portfolio/${id}`;

  return (
    <Link href={articleHref} className={styles.articleCard}>
      {/* Cover Image */}
      <div className={styles.cardCoverWrapper}>
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={title} className={styles.cardCoverImg} />
        ) : (
          <div className={styles.cardCoverPlaceholder}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className={styles.cardBody}>
        <div>
          <div className={styles.cardMetaRow}>
            {formattedDate && <span>{formattedDate}</span>}
            <span>{readingTime} min read</span>
          </div>

          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
        </div>

        <div>
          {projectName && (
            <div className={styles.linkedProjectBadge} style={{ marginBottom: '0.65rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <span>Project: {projectName}</span>
            </div>
          )}

          {tags && tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
              {tags.slice(0, 3).map((tag, tIdx) => (
                <span
                  key={tIdx}
                  style={{
                    fontSize: '0.725rem',
                    fontFamily: 'var(--theme-font-mono)',
                    color: 'var(--theme-muted)',
                    background: 'color-mix(in srgb, var(--theme-border) 60%, transparent)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  #{tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span style={{ fontSize: '0.725rem', color: 'var(--theme-muted)' }}>
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className={styles.readMoreRow}>
            <span>Read Case Study</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
};
