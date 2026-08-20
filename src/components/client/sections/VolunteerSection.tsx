'use client';

import React from 'react';
import type { ResolvedProfileItem } from '@/lib/types/profile.types';
import { formatHref } from '@/lib/utils/url';
import styles from '../client.module.css';

interface VolunteerItemData {
  organization?: string;
  position?: string;
  location?: string;
  period?: string;
  date?: string;
  website?: string;
  url?: string;
  description?: string;
  summary?: string;
}

interface VolunteerSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const VolunteerSection: React.FC<VolunteerSectionProps> = ({ items, columns = 1 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as VolunteerItemData;
        const org = data.organization || 'Organization';
        const position = data.position || 'Volunteer';
        const period = data.period || data.date || '';
        const location = data.location || '';
        const websiteHref = formatHref(data.website || data.url);
        const description = data.description || data.summary || '';

        return (
          <div key={item.id} className={styles.genericItemCard}>
            <div className={styles.genericItemHeader}>
              <h3 className={styles.genericItemTitle}>{position}</h3>
              {period && <span className={styles.genericItemDate}>{period}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.genericLink}
                >
                  <span style={{ fontWeight: 600 }}>{org}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ) : (
                <span className={styles.genericItemSubtitle}>{org}</span>
              )}
              {location && <span style={{ fontSize: '0.8rem', color: 'var(--theme-muted)' }}>• {location}</span>}
            </div>

            {description && (
              <div
                className={styles.genericItemDesc}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
