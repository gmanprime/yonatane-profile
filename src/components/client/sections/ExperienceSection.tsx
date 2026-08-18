'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/services/profile.service';
import styles from '../client.module.css';

interface ExperienceItemData {
  company?: string;
  position?: string;
  location?: string;
  period?: string;
  date?: string;
  website?: string;
  url?: string;
  description?: string;
  summary?: string;
  roles?: Array<{
    title?: string;
    position?: string;
    period?: string;
    date?: string;
    description?: string;
  }>;
  tags?: string[];
  keywords?: string[];
}

interface ExperienceSectionProps {
  items: ResolvedProfileItem[];
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
        const website = data.website || data.url || '';
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
                {website ? (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{location}</span>
                  </span>
                )}
              </div>

              {/* Main Description */}
              {description && (
                <div
                  className={styles.experienceDescription}
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}

              {/* Multi-role career progression */}
              {roles.length > 0 && (
                <div className={styles.rolesProgression}>
                  {roles.map((role, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className={styles.roleStepTitle}>{role.title || role.position}</span>
                        {(role.period || role.date) && (
                          <span className={styles.roleStepPeriod}>{role.period || role.date}</span>
                        )}
                      </div>
                      {role.description && (
                        <div
                          className={styles.experienceDescription}
                          dangerouslySetInnerHTML={{ __html: role.description }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tech Stack Badge Tags */}
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
