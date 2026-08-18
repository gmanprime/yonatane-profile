'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/services/profile.service';
import styles from '../client.module.css';

interface SkillItemData {
  name?: string;
  proficiency?: number | string;
  level?: number | string;
  keywords?: string[];
  icon?: string;
  iconColor?: string;
  description?: string;
}

interface SkillsSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ items, columns = 2 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as SkillItemData;
        const name = data.name || 'Skills';
        const keywords = data.keywords || [];
        const levelRaw = data.level || data.proficiency;

        // Parse numerical level (0 to 5, or percentage 0 to 100)
        let ratingPercent: number | null = null;
        let levelLabel: string | null = null;

        if (typeof levelRaw === 'number') {
          if (levelRaw <= 5) {
            ratingPercent = (levelRaw / 5) * 100;
            levelLabel = `${levelRaw}/5`;
          } else {
            ratingPercent = Math.min(100, Math.max(0, levelRaw));
            levelLabel = `${ratingPercent}%`;
          }
        } else if (typeof levelRaw === 'string' && levelRaw.trim() !== '') {
          const parsed = parseFloat(levelRaw);
          if (!isNaN(parsed)) {
            if (parsed <= 5) {
              ratingPercent = (parsed / 5) * 100;
              levelLabel = `${parsed}/5`;
            } else {
              ratingPercent = Math.min(100, Math.max(0, parsed));
              levelLabel = `${ratingPercent}%`;
            }
          } else {
            levelLabel = levelRaw;
          }
        }

        return (
          <div key={item.id} className={styles.skillCategoryCard}>
            <div className={styles.skillCategoryHeader}>
              <span className={styles.skillCategoryName}>{name}</span>
              {levelLabel && <span className={styles.skillLevelBadge}>{levelLabel}</span>}
            </div>

            {ratingPercent !== null && (
              <div className={styles.skillRatingBar} title={`Proficiency: ${ratingPercent}%`}>
                <div
                  className={styles.skillRatingFill}
                  style={{ width: `${ratingPercent}%` }}
                />
              </div>
            )}

            {data.description && (
              <p style={{ fontSize: '0.85rem', color: 'var(--theme-muted)', margin: 0 }}>
                {data.description}
              </p>
            )}

            {keywords.length > 0 && (
              <div className={styles.skillKeywords}>
                {keywords.map((kw, kwIdx) => (
                  <span key={kwIdx} className={styles.skillKeywordChip}>
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
