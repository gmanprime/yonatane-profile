'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MarkdownPreview } from '@/components/admin/portfolio/MarkdownPreview';
import { type ExternalLinkItem } from '@/components/admin/portfolio/ExternalLinksManager';
import styles from './portfolio.module.css';

interface ArticleReaderProps {
  article: {
    id: string;
    title: string;
    subtitle?: string | null;
    coverImageUrl?: string | null;
    markdownBody: string;
    tags?: string[] | null;
    links?: ExternalLinkItem[] | null;
    publishedAt?: string | Date | null;
    projectItem?: {
      id: string;
      data?: unknown;
    } | null;
  };
  author?: {
    name?: string;
    avatarUrl?: string | null;
    headline?: string | null;
  };
  hash?: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  author,
  hash,
}) => {
  const { title, subtitle, coverImageUrl, markdownBody, tags = [], links = [], publishedAt, projectItem } = article;
  const [copied, setCopied] = useState(false);

  const authorName = author?.name || 'Yonatan Elias';
  const authorHeadline = author?.headline || 'Software Engineer';
  const authorAvatar = author?.avatarUrl || null;

  // Extract Table of Contents from markdown headings
  const toc: TocItem[] = useMemo(() => {
    if (!markdownBody) return [];
    const lines = markdownBody.split('\n');
    const items: TocItem[] = [];

    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        items.push({ id, text, level });
      }
    }

    return items;
  }, [markdownBody]);

  // Word count & reading time
  const wordCount = (markdownBody || '').trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const projectData = (projectItem?.data as Record<string, unknown>) || null;
  const projectName = projectData
    ? (projectData.name as string) || (projectData.title as string) || null
    : null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const homePath = hash && hash !== 'default' ? `/p/${hash}` : '/';
  const galleryPath = hash && hash !== 'default' ? `/p/${hash}/blog` : '/portfolio';

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`Check out "${title}" by ${authorName}:`);
    const url = encodeURIComponent(currentUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(currentUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  return (
    <article className={styles.readerContainer}>
      {/* Navigation Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <Link href={galleryPath} className={styles.backHomeLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>All Case Studies</span>
        </Link>

        <Link
          href={homePath}
          style={{
            fontSize: '0.85rem',
            color: 'var(--theme-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span>View Resume Profile</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Cover Image */}
      {coverImageUrl && (
        <div className={styles.readerCover}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImageUrl} alt={title} className={styles.readerCoverImg} />
        </div>
      )}

      {/* Header Info */}
      <header className={styles.readerHeader}>
        <h1 className={styles.readerTitle}>{title}</h1>
        {subtitle && <p className={styles.readerSubtitle}>{subtitle}</p>}

        {/* Author & Telemetry Meta Bar */}
        <div className={styles.readerMetaBar}>
          <div className={styles.authorPill}>
            {authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={authorAvatar} alt={authorName} className={styles.authorAvatar} />
            ) : (
              <div className={styles.authorAvatar}>
                {authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, color: 'var(--theme-text)', lineHeight: 1.2 }}>{authorName}</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--theme-muted)' }}>{authorHeadline}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--theme-font-mono)', fontSize: '0.8rem' }}>
            {formattedDate && <span>{formattedDate}</span>}
            <span>•</span>
            <span>{readingTime} min read ({wordCount} words)</span>
          </div>
        </div>

        {/* Tag Chips */}
        {tags && tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.8rem',
                  fontFamily: 'var(--theme-font-mono)',
                  color: 'var(--theme-accent)',
                  background: 'color-mix(in srgb, var(--theme-accent) 12%, transparent)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Linked Resume Project Callout */}
        {projectName && (
          <div className={styles.linkedProjectCallout}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theme-muted)', fontWeight: 600 }}>
                Featured Engineering Project
              </span>
              <div className={styles.projectCalloutTitle}>{projectName}</div>
            </div>
            <Link href={`${homePath}#section-projects`} className={styles.projectCalloutLink}>
              <span>View in Resume Profile</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        )}

        {/* External Resources Bar */}
        {links && links.length > 0 && (
          <div className={styles.resourceLinksBar}>
            {links.map((lnk, idx) => (
              <a
                key={idx}
                href={lnk.url.startsWith('http') ? lnk.url : `https://${lnk.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.resourceBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>{lnk.label || 'External Link'}</span>
              </a>
            ))}
          </div>
        )}

        {/* Table of Contents */}
        {toc.length > 2 && (
          <div className={styles.tocBox}>
            <div className={styles.tocTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Table of Contents</span>
            </div>
            <ul className={styles.tocList}>
              {toc.map((item, idx) => (
                <li
                  key={idx}
                  className={
                    item.level === 1
                      ? styles.tocItemL1
                      : item.level === 2
                      ? styles.tocItemL2
                      : styles.tocItemL3
                  }
                >
                  <a href={`#${item.id}`} className={styles.tocLink}>
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Rendered Markdown Body */}
      <MarkdownPreview content={markdownBody} />

      {/* Reader Footer with Share & CTAs */}
      <footer className={styles.readerFooter}>
        <div className={styles.shareSection}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--theme-text)' }}>
            Share this case study
          </span>
          <div className={styles.shareButtons}>
            <button
              type="button"
              onClick={handleCopyLink}
              className={styles.shareBtn}
              title="Copy article link"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={shareOnTwitter}
              className={styles.shareBtn}
              title="Share on X"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
              </svg>
              <span>X (Twitter)</span>
            </button>

            <button
              type="button"
              onClick={shareOnLinkedIn}
              className={styles.shareBtn}
              title="Share on LinkedIn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <span>LinkedIn</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Link href={homePath} className={styles.backHomeLink} style={{ fontSize: '0.9rem', padding: '0.5rem 1.25rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to {authorName}&apos;s Profile</span>
          </Link>
        </div>
      </footer>
    </article>
  );
};
