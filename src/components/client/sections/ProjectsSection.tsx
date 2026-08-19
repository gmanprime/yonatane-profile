'use client';

import React from 'react';
import Link from 'next/link';
import { type ResolvedProfileItem } from '@/lib/types/profile.types';
import styles from '../client.module.css';

interface ProjectItemData {
  name?: string;
  title?: string;
  period?: string;
  date?: string;
  website?: string;
  url?: string;
  description?: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
}

export interface LinkedPortfolioArticle {
  id: string;
  title: string;
  subtitle: string | null;
  coverImageUrl: string | null;
}

interface ProjectsSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
  portfolioArticleMap?: Record<string, LinkedPortfolioArticle>;
  hash?: string;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  items,
  columns = 2,
  portfolioArticleMap = {},
  hash,
}) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as ProjectItemData;
        const name = data.name || data.title || 'Untitled Project';
        const period = data.period || data.date || '';
        const website = data.website || data.url || '';
        const description = data.description || data.summary || '';
        const tags = data.keywords || data.tags || [];

        // Check if there is an attached portfolio case study
        const linkedArticle = portfolioArticleMap[item.id];
        const articleHref = linkedArticle
          ? hash && hash !== 'default'
            ? `/p/${hash}/blog/${linkedArticle.id}`
            : `/portfolio/${linkedArticle.id}`
          : null;

        return (
          <div key={item.id} className={styles.projectCard}>
            <div>
              <div className={styles.projectHeader}>
                <h3 className={styles.projectName}>{name}</h3>
                {period && <span className={styles.projectPeriod}>{period}</span>}
              </div>

              {description && (
                <div
                  className={styles.projectDescription}
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}

              {tags.length > 0 && (
                <div className={styles.tagList} style={{ marginTop: '0.75rem' }}>
                  {tags.map((tag, tIdx) => (
                    <span key={tIdx} className={styles.tagChip}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Links & Case Study CTA */}
            <div className={styles.projectLinksRow}>
              {website && (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.projectDemoLink}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>Live Demo / Code</span>
                </a>
              )}

              {articleHref && (
                <Link href={articleHref} className={styles.projectCaseStudyBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <span>Read Case Study</span>
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
