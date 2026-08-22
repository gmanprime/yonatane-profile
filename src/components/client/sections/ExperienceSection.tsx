'use client';

import React, { useState, useMemo } from 'react';
import type { ResolvedProfileItem } from '@/lib/types/profile.types';
import { formatHref } from '@/lib/utils/url';
import styles from '../client.module.css';

interface ExperienceItemData {
  company?: string;
  position?: string;
  period?: string;
  date?: string;
  location?: string;
  website?: string | { url?: string; label?: string };
  url?: string;
  description?: string;
  summary?: string;
  roles?: string[];
  tags?: string[];
  keywords?: string[];
}

interface ExperienceSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({ items }) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract unique tags/keywords for optional filtering across experiences
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const data = item.data as ExperienceItemData;
      const tags = data.tags || data.keywords || [];
      tags.forEach((t) => set.add(t));
    }
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!selectedTag) return items;
    return items.filter((item) => {
      const data = item.data as ExperienceItemData;
      const tags = data.tags || data.keywords || [];
      const desc = (data.description || data.summary || '').toLowerCase();
      const pos = (data.position || '').toLowerCase();
      const comp = (data.company || '').toLowerCase();
      return (
        tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase()) ||
        desc.includes(selectedTag.toLowerCase()) ||
        pos.includes(selectedTag.toLowerCase()) ||
        comp.includes(selectedTag.toLowerCase())
      );
    });
  }, [items, selectedTag]);

  if (items.length === 0) return null;

  return (
    <div>
      {/* Optional Interactive Filter Bar if there are multiple tags */}
      {allTags.length > 2 && (
        <div className={styles.filterBar} role="toolbar" aria-label="Experience milestones filter">
          <button
            type="button"
            className={`${styles.filterPill} ${!selectedTag ? styles.filterPillActive : ''}`}
            onClick={() => setSelectedTag(null)}
            aria-pressed={!selectedTag}
          >
            <span>All Milestones</span>
            <span className={styles.filterCountBadge}>{items.length}</span>
          </button>
          {allTags.map((tag) => {
            const count = items.filter((item) => {
              const data = item.data as ExperienceItemData;
              const tags = data.tags || data.keywords || [];
              const desc = (data.description || data.summary || '').toLowerCase();
              return (
                tags.some((t) => t.toLowerCase() === tag.toLowerCase()) ||
                desc.includes(tag.toLowerCase())
              );
            }).length;
            const isTagActive = selectedTag === tag;

            return (
              <button
                key={tag}
                type="button"
                className={`${styles.filterPill} ${isTagActive ? styles.filterPillActive : ''}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                aria-pressed={isTagActive}
              >
                <span>{tag}</span>
                <span className={styles.filterCountBadge}>{count}</span>
              </button>
            );
          })}
          {selectedTag && (
            <span className={styles.filterSummary}>
              Showing {filteredItems.length} of {items.length}
            </span>
          )}
        </div>
      )}

      {/* Career Milestone Timeline Cards */}
      <div className={styles.experienceTimeline}>
        {filteredItems.map((item) => {
          const data = item.data as ExperienceItemData;
          const company = data.company || 'Organization';
          const position = data.position || '';
          const period = data.period || data.date || '';
          const location = data.location || '';
          const rawUrl = typeof data.website === 'object' ? data.website?.url : (data.website || data.url);
          const websiteHref = formatHref(rawUrl);
          const description = data.description || data.summary || '';
          const roles = data.roles || [];
          const tags = data.tags || data.keywords || [];

          return (
            <div key={item.id} className={styles.timelineCard}>
              {/* Header: Position & Milestone Date Chip */}
              <div className={styles.experienceHeader}>
                <div className={styles.experienceRoleGroup}>
                  <span className={styles.timelineMarkerDot} aria-hidden="true" />
                  <h3 className={styles.experienceRole}>{position || company}</h3>
                </div>
                {period && (
                  <span className={styles.milestoneDateChip}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{period}</span>
                  </span>
                )}
              </div>

                {/* Company & Location Row */}
                <div className={styles.experienceCompanyRow}>
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.experienceCompanyLink}
                    >
                      <span>{company}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <span className={styles.experienceCompany}>{company}</span>
                  )}

                  {location && (
                    <span className={styles.experienceLocation}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>{location}</span>
                    </span>
                  )}
                </div>

                {/* Description */}
                {description && (
                  <div
                    className={styles.experienceDescription}
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                )}

                {/* Multi-Role Highlights if present */}
                {roles.length > 0 && (
                  <div className={styles.roleSubList}>
                    {roles.map((role, rIdx) => (
                      <div key={rIdx} className={styles.roleSubItem}>
                        <span className={styles.roleBullet}>▹</span>
                        <span>{role}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tech Tags */}
                {tags.length > 0 && (
                  <div className={styles.tagList}>
                    {tags.map((tag, tIdx) => (
                      <span key={tIdx} className={styles.tagChip}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
          );
        })}
      </div>
    </div>
  );
};
