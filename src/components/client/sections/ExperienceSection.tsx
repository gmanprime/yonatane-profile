'use client';

import React from 'react';
import type { ResolvedProfileItem } from '@/lib/types/profile.types';
import { formatHref } from '@/lib/utils/url';
import styles from '../client.module.css';

interface ExperienceItemData {
  company?: string;
  position?: string;
  period?: string;
  date?: string;
  location?: string;
  website?: string;
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
  if (items.length === 0) return null;

  return (
    <div className={styles.experienceTimeline}>
      {items.map((item) => {
        const data = item.data as ExperienceItemData;
        const company = data.company || 'Company';
        const position = data.position || '';
        const period = data.period || data.date || '';
        const location = data.location || '';
        const websiteHref = formatHref(data.website || data.url);
        const description = data.description || data.summary || '';
        const roles = data.roles || [];
        const tags = data.tags || data.keywords || [];

        return (
          <div key={item.id} className={styles.timelineItem}>
            <div className={styles.timelineMarker} />
            <div className={styles.timelineCard}>
              {/* Header: Position & Period */}
              <div className={styles.experienceHeader}>
                <h3 className={styles.experienceRole}>{position || company}</h3>
                {period && <span className={styles.experiencePeriod}>{period}</span>}
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
                {location && <span className={styles.experienceLocation}>• {location}</span>}
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
          </div>
        );
      })}
    </div>
  );
};
