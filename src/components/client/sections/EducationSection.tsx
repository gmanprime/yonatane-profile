'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/types/profile.types';
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
  website?: string;
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

  const gridClass = columns > 1 ? styles.sectionGrid2Col : styles.sectionGrid1Col;

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
        const website = data.website || data.url || '';
        const description = data.description || data.summary || '';
        const rawCourses = data.courses || [];
        const courses = Array.isArray(rawCourses) ? rawCourses : rawCourses ? [rawCourses] : [];

        return (
          <div key={item.id} className={styles.educationCard}>
            <div className={styles.educationDegree}>
              {degree} {area && `in ${area}`}
            </div>

            <div className={styles.educationSchoolRow}>
              {website ? (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.educationSchool}
                >
                  <span>{school}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '4px' }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ) : (
                <span className={styles.educationSchool}>{school}</span>
              )}

              {period && <span className={styles.educationPeriod}>{period}</span>}
            </div>

            {(grade || location) && (
              <div className={styles.educationMetaRow}>
                {grade && <span className={styles.educationGrade}>GPA / Honors: {grade}</span>}
                {location && <span>Location: {location}</span>}
              </div>
            )}

            {description && (
              <div
                className={styles.genericItemDesc}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}

            {courses.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--theme-muted)' }}>
                  Selected Coursework:
                </span>
                <div className={styles.tagList} style={{ marginTop: '0.35rem' }}>
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
