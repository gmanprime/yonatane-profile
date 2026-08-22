'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ResolvedProfileItem } from '@/lib/types/profile.types';
import { formatHref } from '@/lib/utils/url';
import styles from '../client.module.css';

interface ProjectItemData {
  name?: string;
  title?: string;
  period?: string;
  date?: string;
  website?: string | { url?: string; label?: string };
  url?: string;
  description?: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
  category?: string;
  metric?: string;
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

// Heuristic helper to deduce domain / metric badges if not explicitly set
function getProjectMetric(name: string, description: string, tags: string[]): string | null {
  const n = (name + ' ' + description + ' ' + tags.join(' ')).toLowerCase();
  if (n.includes('u-net') || n.includes('gan') || n.includes('super-resolution') || n.includes('thesis')) {
    return 'Deep Learning & Thesis';
  }
  if (n.includes('obsidian') || n.includes('mesh sync') || n.includes('tailscale')) {
    return 'Mesh Architecture';
  }
  if (n.includes('server') || n.includes('ingress') || n.includes('docker')) {
    return 'DevOps & Systems';
  }
  if (n.includes('induction stove') || n.includes('microcontroller') || n.includes('embedded')) {
    return 'Embedded Hardware';
  }
  if (n.includes('gis') || n.includes('qgis') || n.includes('geopandas')) {
    return 'Geospatial Intelligence';
  }
  return null;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  items,
  columns = 2,
  portfolioArticleMap = {},
  hash,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Extract smart domains/tags for filtering
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const item of items) {
      const data = item.data as ProjectItemData;
      const tags = data.keywords || data.tags || [];
      const metric = data.metric || getProjectMetric(data.name || data.title || '', data.description || '', tags);

      if (metric) {
        categories.add(metric);
      }

      // Also add primary keywords
      tags.slice(0, 2).forEach((t) => {
        if (t.length > 2 && t.length < 20) categories.add(t);
      });
    }
    return Array.from(categories);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return items;
    return items.filter((item) => {
      const data = item.data as ProjectItemData;
      const name = (data.name || data.title || '').toLowerCase();
      const desc = (data.description || data.summary || '').toLowerCase();
      const tags = (data.keywords || data.tags || []).map((t) => t.toLowerCase());
      const metric = (data.metric || getProjectMetric(data.name || data.title || '', data.description || '', data.keywords || []) || '').toLowerCase();

      const filterLower = selectedFilter.toLowerCase();
      return (
        metric === filterLower ||
        tags.includes(filterLower) ||
        name.includes(filterLower) ||
        desc.includes(filterLower)
      );
    });
  }, [items, selectedFilter]);

  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div>
      {/* Interactive Filter Pills */}
      {filterOptions.length > 0 && (
        <div className={styles.filterBar} role="toolbar" aria-label="Projects domain filter">
          <button
            type="button"
            className={`${styles.filterPill} ${selectedFilter === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setSelectedFilter('all')}
            aria-pressed={selectedFilter === 'all'}
          >
            <span>All Projects</span>
            <span className={styles.filterCountBadge}>{items.length}</span>
          </button>

          {filterOptions.map((opt) => {
            const count = items.filter((item) => {
              const data = item.data as ProjectItemData;
              const name = (data.name || data.title || '').toLowerCase();
              const desc = (data.description || data.summary || '').toLowerCase();
              const tags = (data.keywords || data.tags || []).map((t) => t.toLowerCase());
              const metric = (data.metric || getProjectMetric(data.name || data.title || '', data.description || '', data.keywords || []) || '').toLowerCase();
              const optLower = opt.toLowerCase();
              return metric === optLower || tags.includes(optLower) || name.includes(optLower) || desc.includes(optLower);
            }).length;

            if (count === 0) return null;
            const isOptActive = selectedFilter === opt;

            return (
              <button
                key={opt}
                type="button"
                className={`${styles.filterPill} ${isOptActive ? styles.filterPillActive : ''}`}
                onClick={() => setSelectedFilter(selectedFilter === opt ? 'all' : opt)}
                aria-pressed={isOptActive}
              >
                <span>{opt}</span>
                <span className={styles.filterCountBadge}>{count}</span>
              </button>
            );
          })}

          {selectedFilter !== 'all' && (
            <span className={styles.filterSummary}>
              Showing {filteredItems.length} of {items.length}
            </span>
          )}
        </div>
      )}

      {/* Filter Empty State */}
      {filteredItems.length === 0 ? (
        <div className={styles.filterEmptyState}>
          No projects found matching filter <strong>&quot;{selectedFilter}&quot;</strong>.
        </div>
      ) : (
        /* Bento Project Grid */
        <div className={gridClass}>
          {filteredItems.map((item) => {
            const data = item.data as ProjectItemData;
            const name = data.name || data.title || 'Untitled Project';
            const period = data.period || data.date || '';
            const rawUrl = typeof data.website === 'object' ? data.website?.url : (data.website || data.url);
            const websiteHref = formatHref(rawUrl);
            const description = data.description || data.summary || '';
            const tags = data.keywords || data.tags || [];
            const metric = data.metric || getProjectMetric(name, description, tags);

            // Check if there is an attached portfolio case study article
            const linkedArticle = portfolioArticleMap[item.id];
            const articleHref = linkedArticle
              ? hash && hash !== 'default'
                ? `/p/${hash}/blog/${linkedArticle.id}`
                : `/portfolio/${linkedArticle.id}`
              : null;

            return (
              <div key={item.id} className={styles.projectCard}>
                <div className={styles.projectHeader}>
                  <div className={styles.projectTopRow}>
                    <h3 className={styles.projectName}>{name}</h3>
                    {period && (
                      <span className={styles.projectPeriod}>{period}</span>
                    )}
                  </div>

                  {metric && (
                    <div>
                      <span className={styles.metricCallout}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>{metric}</span>
                      </span>
                    </div>
                  )}

                  {description && (
                    <div
                      className={styles.projectDescription}
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  )}

                  {/* Tech Badge Pills */}
                  {tags.length > 0 && (
                    <div className={styles.techBadgeList}>
                      {tags.map((tag, tIdx) => {
                        const isPrimary = tIdx < 2 || ['PyTorch', 'Next.js', 'React', 'Docker', 'Python', 'Rust', 'Tailscale', 'C++', 'Ubuntu'].includes(tag);
                        return (
                          <span
                            key={tIdx}
                            className={`${styles.techBadgePill} ${isPrimary ? styles.techBadgePillHighlight : ''}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Links & Case Study CTA Row */}
                <div className={styles.projectLinksRow}>
                  {websiteHref && (
                    <a
                      href={websiteHref}
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
      )}
    </div>
  );
};
