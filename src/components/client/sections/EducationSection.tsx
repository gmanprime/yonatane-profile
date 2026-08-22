'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/types/profile.types';
import { formatHref } from '@/lib/utils/url';
import styles from '../client.module.css';

interface EducationItemData {
  school?: string;
  institution?: string;
  degree?: string;
  studyType?: string;
  area?: string;
  grade?: string;
  score?: string;
  gpa?: string;
  location?: string;
  period?: string;
  date?: string;
  website?: string | { url?: string; label?: string };
  url?: string;
  description?: string;
  summary?: string;
  courses?: string[] | string;
}

interface EducationSectionProps {
  items: ResolvedProfileItem[];
  columns?: number;
}

export const EducationSection: React.FC<EducationSectionProps> = ({ items, columns = 1 }) => {
  if (items.length === 0) return null;

  const gridClass = columns === 2 ? styles.educationGrid2Col : styles.educationGrid1Col;

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const data = item.data as EducationItemData;
        const school = data.school || data.institution || 'University';
        const degree = data.degree || data.studyType || 'Degree';
        const area = data.area || '';
        const period = data.period || data.date || '';
        const location = data.location || '';
        const grade = data.grade || data.score || data.gpa || '';
        const rawUrl = typeof data.website === 'object' ? data.website?.url : (data.website || data.url);
        const websiteHref = formatHref(rawUrl);
        const description = data.description || data.summary || '';
        const rawCourses = data.courses || [];
        const courses = Array.isArray(rawCourses) ? rawCourses : rawCourses ? [rawCourses] : [];

        // Check if description is a thesis
        const isThesis = description.toLowerCase().includes('thesis') || description.toLowerCase().includes('u-net');

        return (
          <div key={item.id} className={styles.educationCard}>
            <div className={styles.educationDegree}>
              {degree} {area && `in ${area}`}
            </div>

            <div className={styles.educationSchoolRow}>
              {websiteHref ? (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.educationSchool}
                >
                  <span>{school}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ) : (
                <span className={styles.educationSchool}>{school}</span>
              )}

              {period && (
                <span className={styles.milestoneDateChip}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{period}</span>
                </span>
              )}
            </div>

            {(grade || location) && (
              <div className={styles.educationMetaRow}>
                {grade && (
                  <span className={styles.educationGradeBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                    <span>{grade}</span>
                  </span>
                )}
                {location && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.825rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{location}</span>
                  </span>
                )}
              </div>
            )}

            {description && isThesis ? (
              <div
                className={styles.thesisHighlightBox}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : description ? (
              <div
                className={styles.genericItemDesc}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : null}

            {courses.length > 0 && (
              <div style={{ marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--theme-muted)' }}>
                  Selected Coursework:
                </span>
                <div className={styles.tagList} style={{ marginTop: '0.4rem' }}>
                  {courses.map((course, cIdx) => (
                    <span key={cIdx} className={styles.tagChip}>
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
