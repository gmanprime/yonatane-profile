'use client';

import React, { useState } from 'react';
import styles from './metadata.module.css';

const SUGGESTED_TAGS = [
  'TypeScript',
  'Next.js',
  'React',
  'Node.js',
  'PostgreSQL',
  'Drizzle ORM',
  'Supabase',
  'System Architecture',
  'Stealth Infrastructure',
  'Full-Stack',
  'AI / LLM',
  'TailwindCSS',
  'Docker',
  'DevOps',
  'GraphQL',
  'REST API',
  'WebSockets',
  'Performance',
  'Security',
  'Clean Code',
];

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ tags, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = (rawTag: string) => {
    const clean = rawTag.replace(/^[#,]+/, '').trim();
    if (!clean) return;

    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      onChange([...tags, clean]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const remainingSuggestions = SUGGESTED_TAGS.filter(
    (sug) => !tags.some((t) => t.toLowerCase() === sug.toLowerCase())
  ).slice(0, 8);

  return (
    <div className={styles.metaControl}>
      <label className={styles.controlLabel}>
        <span>Article Tags</span>
        <span className={styles.labelHint}>Press Enter or comma to add</span>
      </label>

      <div className={styles.tagInputContainer}>
        <div className={styles.tagPillList}>
          {tags.map((tag, idx) => (
            <span key={idx} className={styles.tagPill}>
              <span className={styles.tagHash}>#</span>
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className={styles.removeTagBtn}
                title={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : 'Add another tag...'}
            className={styles.tagInputField}
          />
        </div>
      </div>

      {remainingSuggestions.length > 0 && (
        <div className={styles.suggestedTagsWrapper}>
          <span className={styles.suggestedLabel}>Suggested:</span>
          <div className={styles.suggestedList}>
            {remainingSuggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                className={styles.suggestedTagBtn}
                onClick={() => addTag(sug)}
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
