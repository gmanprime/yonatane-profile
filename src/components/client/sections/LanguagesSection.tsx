'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/types/profile.types';
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

function parseProficiencyScore(data: LanguageItemData): { score: number; label: string } {
  if (typeof data.level === 'number' && data.level >= 1 && data.level <= 5) {
    const score = Math.round(data.level);
    const label =
      score === 5 ? 'Native / Mastery (C2)' :
      score === 4 ? 'Advanced (C1)' :
      score === 3 ? 'Independent / Working (B2)' :
      score === 2 ? 'Threshold (B1)' : 'Elementary (A1-A2)';
    return { score, label };
  }

  const text = `${data.fluency || ''} ${data.level || ''}`.toLowerCase();
  if (text.includes('native') || text.includes('mother tongue') || text.includes('c2')) {
    return { score: 5, label: 'Native / Bilingual (C2)' };
  }
  if (text.includes('c1') || text.includes('fluent') || text.includes('advanced')) {
    return { score: 4, label: 'Full Professional (C1)' };
  }
  if (text.includes('b2') || text.includes('independent') || text.includes('working')) {
    return { score: 3, label: 'Professional Working (B2)' };
  }
  if (text.includes('b1') || text.includes('conversational') || text.includes('intermediate')) {
    return { score: 2, label: 'Limited Working (B1)' };
  }
  if (text.includes('a1') || text.includes('a2') || text.includes('elementary')) {
    return { score: 1, label: 'Elementary (A1/A2)' };
  }

  return { score: 5, label: 'Proficient' };
}

export const LanguagesSection: React.FC<LanguagesSectionProps> = ({ items, columns = 2 }) => {
  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as LanguageItemData;
        const language = data.language || data.name || 'Language';
        const rawFluency = data.fluency || (typeof data.level === 'string' ? data.level : '');
        const { score, label } = parseProficiencyScore(data);
        const percentage = Math.round((score / 5) * 100);

        return (
          <div key={item.id} className={styles.languageCard}>
            {/* Header: Name + Raw Tag */}
            <div className={styles.languageHeader}>
              <div className={styles.languageNameGroup}>
                <div className={styles.languageIconBadge} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
                <span className={styles.languageName}>{language}</span>
              </div>
              {rawFluency && <span className={styles.languageFluencyTag}>{rawFluency}</span>}
            </div>

            {/* 5-Segment Luminous Gauge Meter */}
            <div className={styles.languageGaugeWrapper}>
              <div
                className={styles.languageGaugeSegments}
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={1}
                aria-valuemax={5}
                aria-label={`${language} proficiency: ${score} of 5 (${label})`}
              >
                {[1, 2, 3, 4, 5].map((seg) => (
                  <div
                    key={seg}
                    className={`${styles.languageSegment} ${seg <= score ? styles.languageSegmentFilled : ''}`}
                  />
                ))}
              </div>

              {/* Meter Footer Meta */}
              <div className={styles.languageGaugeMeta}>
                <span>{label}</span>
                <span className={styles.languageScore}>{score}/5 &middot; {percentage}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
