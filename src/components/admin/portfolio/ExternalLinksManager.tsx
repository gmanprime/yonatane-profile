'use client';

import React from 'react';
import styles from './metadata.module.css';

export interface ExternalLinkItem {
  label: string;
  url: string;
}

const PRESET_LABELS = [
  'GitHub Repository',
  'Live Production Demo',
  'Technical Whitepaper',
  'Engineering Case Study',
  'System Architecture Spec',
  'Interactive Figma Prototype',
  'API Documentation',
  'Video Walkthrough',
  'NPM Package',
  'Research Paper',
];

interface ExternalLinksManagerProps {
  links: ExternalLinkItem[];
  onChange: (links: ExternalLinkItem[]) => void;
}

export const ExternalLinksManager: React.FC<ExternalLinksManagerProps> = ({
  links,
  onChange,
}) => {
  const handleAddLink = () => {
    onChange([...links, { label: 'Live Demo', url: '' }]);
  };

  const handleUpdate = (index: number, field: keyof ExternalLinkItem, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, idx) => idx !== index));
  };

  return (
    <div className={styles.metaControl}>
      <div className={styles.controlHeader}>
        <label className={styles.controlLabel}>
          <span>External Resources & Action Links</span>
          <span className={styles.labelHint}>Repositories, demos, case studies & whitepapers</span>
        </label>
        <button
          type="button"
          onClick={handleAddLink}
          className={styles.addLinkBtn}
        >
          + Add External Link
        </button>
      </div>

      {links.length === 0 ? (
        <div className={styles.emptyLinksBox}>
          <p>No external links added. Add links to GitHub repositories, live demos, or technical whitepapers.</p>
          <button
            type="button"
            onClick={handleAddLink}
            className={styles.emptyAddBtn}
          >
            + Add First Link
          </button>
        </div>
      ) : (
        <div className={styles.linkRowsList}>
          {links.map((link, idx) => (
            <div key={idx} className={styles.linkRowCard}>
              <div className={styles.linkInputs}>
                {/* Label Select / Input */}
                <div className={styles.labelCol}>
                  <input
                    type="text"
                    list={`preset-labels-${idx}`}
                    value={link.label}
                    onChange={(e) => handleUpdate(idx, 'label', e.target.value)}
                    placeholder="e.g. GitHub Repository"
                    className={styles.inputField}
                  />
                  <datalist id={`preset-labels-${idx}`}>
                    {PRESET_LABELS.map((p, pIdx) => (
                      <option key={pIdx} value={p} />
                    ))}
                  </datalist>
                </div>

                {/* URL Input */}
                <div className={styles.urlCol}>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleUpdate(idx, 'url', e.target.value)}
                    placeholder="https://..."
                    className={styles.inputField}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.linkActions}>
                {link.url && (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.testLinkBtn}
                    title="Test Link (Opens in new tab)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className={styles.removeLinkBtn}
                  title="Remove link"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
