'use client';

import React, { useState, useEffect } from 'react';
import styles from './client.module.css';

export interface NavSection {
  id: string;
  title: string;
  type: string;
}

interface SectionNavProps {
  sections: NavSection[];
}

export const SectionNav: React.FC<SectionNavProps> = ({ sections }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id || '');

  useEffect(() => {
    if (sections.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const el = document.getElementById(section.id) || document.getElementById(`section-${section.type}`);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSectionId(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  if (sections.length <= 1) return null;

  const scrollToSection = (sectionId: string, type: string) => {
    const el = document.getElementById(sectionId) || document.getElementById(`section-${type}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.stickyNavWrapper}>
      <nav className={styles.stickyNav} aria-label="Resume sections navigation">
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => scrollToSection(sec.id, sec.type)}
            className={`${styles.navPill} ${activeSectionId === sec.id ? styles.navPillActive : ''}`}
          >
            {sec.title}
          </button>
        ))}
      </nav>
    </div>
  );
};
