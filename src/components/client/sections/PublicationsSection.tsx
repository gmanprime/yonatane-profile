'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/services/profile.service';
import styles from '../client.module.css';

interface PublicationItemData {
  title?: string;
  name?: string;
  publisher?: string;
  date?: string;
  website?: string;
  url?: string;
  description?: string;
  summary?: string;
}

interface PublicationsSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const PublicationsSection: React.FC<PublicationsSectionProps> = ({ items, columns = 1 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as PublicationItemData;
        const title = data.title || data.name || 'Publication';
        const publisher = data.publisher || '';
        const date = data.date || '';
        const website = data.website || data.url || '';
        const description = data.description || data.summary || '';

        return (
          <div key={item.id} className={styles.genericItemCard}>
            <div className={styles.genericItemHeader}>
              <h3 className={styles.genericItemTitle}>{title}</h3>
              {date && <span className={styles.genericItemDate}>{date}</span>}
            </div>

            {publisher && <div className={styles.genericItemSubtitle}>Published in: {publisher}</div>}

            {description && (
              <div
                className={styles.genericItemDesc}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}

            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.genericLink}
              >
                <span>Read Publication</span>
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
