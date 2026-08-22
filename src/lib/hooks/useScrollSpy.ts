'use client';

import { useState, useEffect } from 'react';

interface UseScrollSpyOptions {
  offset?: number;
  threshold?: number | number[];
  rootMargin?: string;
}

export function useScrollSpy(
  sectionIds: string[],
  options: UseScrollSpyOptions = {}
): string {
  const {
    offset = 120,
    threshold = [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    rootMargin = '-15% 0px -55% 0px',
  } = options;

  const [activeId, setActiveId] = useState<string>(sectionIds[0] || '');

  useEffect(() => {
    if (sectionIds.length === 0 || typeof window === 'undefined') return;

    // Track intersection entries
    const visibleSectionMap = new Map<string, number>();

    const observerCallback: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleSectionMap.set(entry.target.id, entry.intersectionRatio);
        } else {
          visibleSectionMap.delete(entry.target.id);
        }
      }

      if (visibleSectionMap.size > 0) {
        // Pick the visible section with highest intersection ratio or topmost visible
        let bestId = '';
        let highestRatio = -1;

        for (const id of sectionIds) {
          if (visibleSectionMap.has(id)) {
            const ratio = visibleSectionMap.get(id) ?? 0;
            if (ratio > highestRatio) {
              highestRatio = ratio;
              bestId = id;
            }
          }
        }

        if (bestId) {
          setActiveId(bestId);
        }
      }
    };

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(observerCallback, {
        rootMargin,
        threshold,
      });

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          observer.observe(el);
        }
      }
    } catch {
      // Fallback if IntersectionObserver fails
    }

    // Scroll listener fallback for accurate tracking during rapid flings & top/bottom boundaries
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Top boundary
      if (scrollY < 120 && sectionIds.length > 0) {
        setActiveId(sectionIds[0]);
        return;
      }

      // Bottom boundary
      if (scrollY + windowHeight >= documentHeight - 60 && sectionIds.length > 0) {
        setActiveId(sectionIds[sectionIds.length - 1]);
        return;
      }

      // Find section by offset
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - offset;
          if (scrollY >= top) {
            setActiveId(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run initial check
    handleScroll();

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds, offset, rootMargin, threshold]);

  return activeId;
}
