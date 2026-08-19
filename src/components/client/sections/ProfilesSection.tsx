'use client';

import React from 'react';
import { type ResolvedProfileItem } from '@/lib/types/profile.types';
import styles from '../client.module.css';

interface ProfileItemData {
  network?: string;
  username?: string;
  website?: string;
  url?: string;
  icon?: string;
  iconColor?: string;
}

interface ProfilesSectionProps {
  items: ResolvedProfileItem[];
}

function getNetworkIcon(network = '') {
  const n = network.toLowerCase();
  if (n.includes('github')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    );
  }
  if (n.includes('linkedin')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (n.includes('twitter') || n.includes(' x')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
      </svg>
    );
  }
  if (n.includes('medium') || n.includes('substack') || n.includes('blog')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    );
  }
  if (n.includes('leetcode') || n.includes('code') || n.includes('hackerrank')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  // Generic Globe / Link
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export const ProfilesSection: React.FC<ProfilesSectionProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className={styles.profilesGrid}>
      {items.map((item) => {
        const data = item.data as ProfileItemData;
        const network = data.network || 'Profile';
        const username = data.username || '';
        const url = data.website || data.url || '';

        const cardContent = (
          <>
            <div className={styles.socialIconWrapper}>{getNetworkIcon(network)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={styles.socialNetwork}>{network}</div>
              {username && <div className={styles.socialUsername}>@{username}</div>}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: 'var(--theme-muted)', flexShrink: 0 }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </>
        );

        if (url) {
          return (
            <a
              key={item.id}
              href={url.startsWith('http') ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.profileSocialCard}
            >
              {cardContent}
            </a>
          );
        }

        return (
          <div key={item.id} className={styles.profileSocialCard}>
            {cardContent}
          </div>
        );
      })}
    </div>
  );
};
