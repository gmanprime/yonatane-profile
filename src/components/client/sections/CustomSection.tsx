'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/services/profile.service';
import styles from '../client.module.css';

interface CustomItemData {
  title?: string;
  name?: string;
  subtitle?: string;
  period?: string;
  date?: string;
  website?: string;
  url?: string;
  description?: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
}

interface CustomSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const CustomSection: React.FC<CustomSectionProps> = ({ items, columns = 1 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as CustomItemData;
        const title = data.title || data.name || '';
        const subtitle = data.subtitle || '';
        const period = data.period || data.date || '';
        const website = data.website || data.url || '';
        const description = data.description || data.summary || '';
        const tags = data.keywords || data.tags || [];

        return (
          <div key={item.id} className={styles.genericItemCard}>
            <div className={styles.genericItemHeader}>
              {title && <h3 className={styles.genericItemTitle}>{title}</h3>}
              {period && <span className={styles.genericItemDate}>{period}</span>}
            </div>

            {subtitle && <div className={styles.genericItemSubtitle}>{subtitle}</div>}

            {description && (
              <div
                className={styles.genericItemDesc}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}

            {tags.length > 0 && (
              <div className={styles.tagList}>
                {tags.map((tag, tIdx) => (
                  <span key={tIdx} className={styles.tagChip}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.genericLink}
              >
                <span>Learn More</span>
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
