'use client';

import React from 'react';
import styles from './toolbar.module.css';

export type EditorViewMode = 'split' | 'editor' | 'preview';

interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix?: string, defaultPlaceholder?: string) => void;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  wordCount: number;
  charCount: number;
  paragraphCount: number;
  readingTimeMinutes: number;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  onInsert,
  viewMode,
  onViewModeChange,
  wordCount,
  charCount,
  paragraphCount,
  readingTimeMinutes,
}) => {
  return (
    <div className={styles.toolbarRoot}>
      {/* Top row: Format Controls & View Switcher */}
      <div className={styles.controlsRow}>
        <div className={styles.formatGroup}>
          {/* Headings */}
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('# ', '', 'Heading 1')}
            title="Heading 1 (# )"
          >
            H1
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('## ', '', 'Heading 2')}
            title="Heading 2 (## )"
          >
            H2
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('### ', '', 'Heading 3')}
            title="Heading 3 (### )"
          >
            H3
          </button>

          <span className={styles.divider} />

          {/* Text Styling */}
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('**', '**', 'bold text')}
            title="Bold (**text**)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('*', '*', 'italic text')}
            title="Italic (*text*)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('~~', '~~', 'strikethrough text')}
            title="Strikethrough (~~text~~)"
          >
            <del>S</del>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('==', '==', 'highlighted text')}
            title="Highlight (==text==)"
          >
            <mark className={styles.markIcon}>H</mark>
          </button>

          <span className={styles.divider} />

          {/* Code */}
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('`', '`', 'code')}
            title="Inline Code (`code`)"
          >
            <code>&lt;/&gt;</code>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('```typescript\n', '\n```', '// Your code here')}
            title="Code Block (```ts)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </button>

          <span className={styles.divider} />

          {/* Lists */}
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('- ', '', 'List item')}
            title="Bullet List (- )"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('1. ', '', 'Numbered item')}
            title="Numbered List (1. )"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <path d="M4 6h1v4" />
              <path d="M4 10h2" />
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('- [ ] ', '', 'Task checklist item')}
            title="Checklist (- [ ] )"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </button>

          <span className={styles.divider} />

          {/* Callouts */}
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.calloutBtn}`}
            onClick={() => onInsert('> [!NOTE]\n> ', '', 'Important note or context')}
            title="Note Callout (> [!NOTE])"
          >
            <span className={styles.noteDot} /> Note
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.calloutBtn}`}
            onClick={() => onInsert('> [!TIP]\n> ', '', 'Helpful tip or best practice')}
            title="Tip Callout (> [!TIP])"
          >
            <span className={styles.tipDot} /> Tip
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.calloutBtn}`}
            onClick={() => onInsert('> [!WARNING]\n> ', '', 'Warning or caveat')}
            title="Warning Callout (> [!WARNING])"
          >
            <span className={styles.warnDot} /> Warn
          </button>

          <span className={styles.divider} />

          {/* Links, Images, Tables, HR */}
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('[', '](https://example.com)', 'link label')}
            title="Hyperlink ([label](url))"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('![', '](https://images.unsplash.com/photo-1555066931-4365d14bab8c)', 'Image Alt Description')}
            title="Image (![alt](url))"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() =>
              onInsert(
                '| Feature | Description | Status |\n|:---|:---|:---|\n| API Layer | REST v1 endpoints | Done |\n| Storage | Supabase bucket | Active |\n\n',
                '',
                ''
              )
            }
            title="Markdown Table"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => onInsert('\n---\n\n', '', '')}
            title="Horizontal Rule (---)"
          >
            ―
          </button>
        </div>

        {/* View Mode Toggle Switch */}
        <div className={styles.viewModeGroup}>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'split' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('split')}
            title="Side-by-side Split View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span>Split</span>
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'editor' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('editor')}
            title="Editor Only (Focus Mode)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Editor</span>
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${viewMode === 'preview' ? styles.viewBtnActive : ''}`}
            onClick={() => onViewModeChange('preview')}
            title="Preview Only (Reader View)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Real-time Writing Telemetry / Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statsList}>
          <span className={styles.statItem}>
            <strong>{wordCount.toLocaleString()}</strong> words
          </span>
          <span className={styles.statDot}>•</span>
          <span className={styles.statItem}>
            <strong>{charCount.toLocaleString()}</strong> characters
          </span>
          <span className={styles.statDot}>•</span>
          <span className={styles.statItem}>
            <strong>{paragraphCount}</strong> paragraphs
          </span>
          <span className={styles.statDot}>•</span>
          <span className={styles.statItem}>
            <strong>~{readingTimeMinutes} min</strong> read
          </span>
        </div>

        <div className={styles.shortcutHint}>
          <span>💡 Tip: Markdown syntax formatting automatically live-renders in the preview pane</span>
        </div>
      </div>
    </div>
  );
};
