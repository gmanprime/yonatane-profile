'use client';

import React from 'react';
import type { ResolvedProfileItem } from '@/lib/types/profile.types';
import { formatHref } from '@/lib/utils/url';
import styles from '../client.module.css';

interface AwardItemData {
  title?: string;
  awarder?: string;
  date?: string;
  website?: string;
  url?: string;
  description?: string;
  summary?: string;
}

interface AwardsSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const AwardsSection: React.FC<AwardsSectionProps> = ({ items, columns = 2 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as AwardItemData;
        const title = data.title || 'Honors & Awards';
        const awarder = data.awarder || '';
        const date = data.date || '';
        const websiteHref = formatHref(data.website || data.url);
        const description = data.description || data.summary || '';

        return (
          <div key={item.id} className={styles.genericItemCard}>
            <div className={styles.genericItemHeader}>
              <h3 className={styles.genericItemTitle}>{title}</h3>
              {date && <span className={styles.genericItemDate}>{date}</span>}
            </div>

            {awarder && <div className={styles.genericItemSubtitle}>{awarder}</div>}

            {description && (
              <div
                className={styles.genericItemDesc}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}

            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.genericLink}
              >
                <span>View Award Info</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
};
