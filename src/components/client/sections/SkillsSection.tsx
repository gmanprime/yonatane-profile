'use client';

import React, { useState, useMemo } from 'react';
import { type ResolvedProfileItem } from '@/lib/types/profile.types';
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

// Category icon helper
function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('programming') || n.includes('language') || n.includes('code')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (n.includes('web') || n.includes('stack') || n.includes('frontend') || n.includes('backend')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  if (n.includes('machine') || n.includes('learning') || n.includes('data') || n.includes('ai') || n.includes('science')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  }
  if (n.includes('system') || n.includes('infra') || n.includes('devops') || n.includes('os') || n.includes('cloud')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </svg>
    );
  }
  if (n.includes('engineer') || n.includes('electronic') || n.includes('circuit') || n.includes('hardware')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18h12M6 6h12M12 6v12" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({ items, columns = 2 }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = useMemo(() => {
    return items.map((item) => {
      const data = item.data as SkillItemData;
      return data.name || 'Category';
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const data = item.data as SkillItemData;
      const name = (data.name || '').toLowerCase();
      const keywords = (data.keywords || []).map((k) => k.toLowerCase());
      const desc = (data.description || '').toLowerCase();
      const prof = (typeof data.proficiency === 'string' ? data.proficiency : '').toLowerCase();

      const matchesCategory =
        selectedCategory === 'all' || name.toLowerCase() === selectedCategory.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        name.includes(query) ||
        keywords.some((k) => k.includes(query)) ||
        desc.includes(query) ||
        prof.includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  if (items.length === 0) return null;

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

  return (
    <div>
      {/* Interactive Filter Pills Bar */}
      {categories.length > 1 && (
        <div className={styles.filterBar} role="toolbar" aria-label="Skills category filter">
          <button
            type="button"
            className={`${styles.filterPill} ${selectedCategory === 'all' && !searchQuery ? styles.filterPillActive : ''}`}
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            aria-pressed={selectedCategory === 'all' && !searchQuery}
          >
            <span>All Categories</span>
            <span className={styles.filterCountBadge}>{items.length}</span>
          </button>

          {categories.map((cat) => {
            const count = items.filter((item) => {
              const data = item.data as SkillItemData;
              return (data.name || '').toLowerCase() === cat.toLowerCase();
            }).length;
            const isCatActive = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                className={`${styles.filterPill} ${isCatActive ? styles.filterPillActive : ''}`}
                onClick={() => {
                  setSelectedCategory(selectedCategory === cat ? 'all' : cat);
                  setSearchQuery('');
                }}
                aria-pressed={isCatActive}
              >
                <span>{cat}</span>
                <span className={styles.filterCountBadge}>{count}</span>
              </button>
            );
          })}

          {selectedCategory !== 'all' && (
            <span className={styles.filterSummary}>
              Showing {filteredItems.length} of {items.length}
            </span>
          )}
        </div>
      )}

      {/* Filter Empty State */}
      {filteredItems.length === 0 ? (
        <div className={styles.filterEmptyState}>
          No skills found matching filter.
        </div>
      ) : (
        /* Bento Grid */
        <div className={gridClass}>
          {filteredItems.map((item) => {
            const data = item.data as SkillItemData;
            const name = data.name || 'Skills';
            const keywords = data.keywords || [];
            const levelRaw = data.level ?? data.proficiency;
            const proficiencySubtitle =
              typeof data.proficiency === 'string' && data.proficiency.trim() !== ''
                ? data.proficiency
                : null;

            // Parse numerical level (0 to 5, or percentage 0 to 100)
            let ratingPercent: number | null = null;
            let levelLabel: string | null = null;

            if (typeof levelRaw === 'number' && levelRaw > 0) {
              if (levelRaw <= 5) {
                ratingPercent = (levelRaw / 5) * 100;
                levelLabel = `${levelRaw}/5`;
              } else {
                ratingPercent = Math.min(100, Math.max(0, levelRaw));
                levelLabel = `${ratingPercent}%`;
              }
            } else if (typeof levelRaw === 'string' && levelRaw.trim() !== '') {
              const parsed = parseFloat(levelRaw);
              if (!isNaN(parsed) && parsed > 0) {
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'color-mix(in srgb, var(--theme-primary, #6366f1) 15%, transparent)',
                        color: 'var(--theme-accent, #38bdf8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getCategoryIcon(name)}
                    </div>
                    <div>
                      <span className={styles.skillCategoryName}>{name}</span>
                      {proficiencySubtitle && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--theme-muted)', marginTop: '2px' }}>
                          {proficiencySubtitle}
                        </div>
                      )}
                    </div>
                  </div>

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
                  <p style={{ fontSize: '0.85rem', color: 'var(--theme-muted)', margin: 0, lineHeight: 1.55 }}>
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
      )}
    </div>
  );
};
