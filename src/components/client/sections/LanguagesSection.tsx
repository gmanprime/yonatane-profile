'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/services/profile.service';
import styles from '../client.module.css';

interface LanguageItemData {
  language?: string;
  name?: string;
  fluency?: string;
  level?: string | number;
}

interface LanguagesSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const LanguagesSection: React.FC<LanguagesSectionProps> = ({ items, columns = 2 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as LanguageItemData;
        const language = data.language || data.name || 'Language';
        const fluency = data.fluency || (typeof data.level === 'string' ? data.level : '');

        return (
          <div key={item.id} className={styles.skillCategoryCard}>
            <div className={styles.skillCategoryHeader}>
              <span className={styles.skillCategoryName}>{language}</span>
              {fluency && <span className={styles.skillLevelBadge}>{fluency}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
