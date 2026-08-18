'use client';

import React, { useState } from 'react';
import styles from './preview.module.css';

interface MarkdownPreviewProps {
  content: string;
  title?: string;
  subtitle?: string;
  coverImageUrl?: string | null;
  tags?: string[];
  publishedAt?: string | null;
  status?: 'draft' | 'published';
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  title,
  subtitle,
  coverImageUrl,
  tags = [],
  publishedAt,
  status,
}) => {
  return (
    <article className={styles.previewArticle}>
      {/* Cover Image */}
      {coverImageUrl && (
        <div className={styles.coverWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImageUrl} alt={title || 'Article Cover'} className={styles.coverImg} />
        </div>
      )}

      {/* Header Info */}
      <header className={styles.articleHeader}>
        {status && (
          <div className={styles.metaTop}>
            <span className={status === 'published' ? styles.statusPublished : styles.statusDraft}>
              {status === 'published' ? '● Published' : '○ Draft'}
            </span>
            {publishedAt && (
              <span className={styles.publishDate}>
                {new Date(publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        )}

        {title && <h1 className={styles.articleTitle}>{title}</h1>}
        {subtitle && <p className={styles.articleSubtitle}>{subtitle}</p>}

        {tags.length > 0 && (
          <div className={styles.tagChips}>
            {tags.map((tag, idx) => (
              <span key={idx} className={styles.tagChip}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Rendered Markdown Body */}
      <div className={styles.markdownBody}>
        {content.trim() ? (
          <ParsedMarkdown raw={content} />
        ) : (
          <div className={styles.emptyPreview}>
            <p>Start writing markdown on the left to see the live formatted preview here...</p>
          </div>
        )}
      </div>
    </article>
  );
};

// ============================================================
// Custom High-Fidelity Markdown Parser & AST Renderer
// ============================================================
function ParsedMarkdown({ raw }: { raw: string }) {
  const renderedElements = renderMarkdown(raw);
  return <>{renderedElements}</>;
}

function renderMarkdown(raw: string): React.ReactNode[] {
  const lines = raw.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Code Block ```lang
    if (line.trim().startsWith('```')) {
      const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
      const language = langMatch ? langMatch[1] : '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      const codeContent = codeLines.join('\n');
      elements.push(
        <CodeBlock key={`code-${i}`} language={language} code={codeContent} />
      );
      continue;
    }

    // Callout box / GitHub alert (> [!NOTE], > [!TIP], etc.)
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      const firstLine = quoteLines[0]?.trim() || '';
      const alertMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase() as
          | 'NOTE'
          | 'TIP'
          | 'IMPORTANT'
          | 'WARNING'
          | 'CAUTION';
        const alertBody = quoteLines.slice(1).join('\n');
        elements.push(
          <AlertCallout key={`alert-${i}`} type={alertType} body={alertBody} />
        );
      } else {
        // Standard Blockquote
        elements.push(
          <blockquote key={`quote-${i}`} className={styles.blockquote}>
            {quoteLines.map((qLine, qIdx) => (
              <p key={qIdx}>{renderInline(qLine)}</p>
            ))}
          </blockquote>
        );
      }
      continue;
    }

    // Headings # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const anchorId = headingText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      elements.push(
        <HeadingTag key={`h-${i}`} id={anchorId} className={styles[`h${level}`]}>
          <a href={`#${anchorId}`} className={styles.headingAnchor}>
            #
          </a>
          {renderInline(headingText)}
        </HeadingTag>
      );
      i++;
      continue;
    }

    // Horizontal Rule --- or ***
    if (line.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
      elements.push(<hr key={`hr-${i}`} className={styles.hr} />);
      i++;
      continue;
    }

    // Table Detection | col1 | col2 |
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].includes('-')) {
      const headerRow = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
      i += 2; // Skip header and separator line
      const bodyRows: string[][] = [];

      while (i < lines.length && lines[i].includes('|')) {
        const row = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1);
        if (row.length > 0) {
          bodyRows.push(row);
        }
        i++;
      }

      elements.push(
        <div key={`table-${i}`} className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {headerRow.map((head, hIdx) => (
                  <th key={hIdx}>{renderInline(head)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((bRow, rIdx) => (
                <tr key={rIdx}>
                  {bRow.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered List - or *
    if (line.match(/^[-*]\s+/)) {
      const listItems: { text: string; isTask?: boolean; checked?: boolean }[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        const rawText = lines[i].replace(/^[-*]\s+/, '');
        const taskMatch = rawText.match(/^\[([ xX])\]\s+(.*)/);
        if (taskMatch) {
          listItems.push({
            text: taskMatch[2],
            isTask: true,
            checked: taskMatch[1].toLowerCase() === 'x',
          });
        } else {
          listItems.push({ text: rawText });
        }
        i++;
      }

      elements.push(
        <ul key={`ul-${i}`} className={styles.ul}>
          {listItems.map((item, lIdx) => (
            <li
              key={lIdx}
              className={item.isTask ? styles.taskListItem : styles.listItem}
            >
              {item.isTask ? (
                <>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className={styles.taskCheckbox}
                  />
                  <span>{renderInline(item.text)}</span>
                </>
              ) : (
                renderInline(item.text)
              )}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List 1. 2.
    if (line.match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className={styles.ol}>
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className={styles.listItem}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Image block standalone: ![alt](url)
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      elements.push(
        <div key={`img-${i}`} className={styles.imageBlock}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgMatch[2]} alt={imgMatch[1]} className={styles.contentImg} />
          {imgMatch[1] && <span className={styles.imgCaption}>{imgMatch[1]}</span>}
        </div>
      );
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={`p-${i}`} className={styles.paragraph}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return elements;
}

// Inline token renderer for bold, italics, code, links, strikethrough, highlights
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // We can parse inline elements using regex replacements or recursive segment splitting
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // 1. Inline Image ![alt](url)
    const imgMatch = remaining.match(/^!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key++}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          className={styles.inlineImg}
        />
      );
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // 2. Link [text](url)
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 3. Inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className={styles.inlineCode}>
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 4. Bold **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 5. Italic *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 6. Strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      parts.push(<del key={key++}>{strikeMatch[1]}</del>);
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 7. Highlight ==text==
    const markMatch = remaining.match(/^==(.*?)==/);
    if (markMatch) {
      parts.push(
        <mark key={key++} className={styles.highlight}>
          {markMatch[1]}
        </mark>
      );
      remaining = remaining.slice(markMatch[0].length);
      continue;
    }

    // Regular character slice until next special markdown symbol
    const nextSpecial = remaining.search(/[`*_[!~=]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts;
}

// Code Block with syntax tag and copy button
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={styles.copyBtn}
          title="Copy code"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className={styles.codePre}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Alert Callout box
function AlertCallout({
  type,
  body,
}: {
  type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';
  body: string;
}) {
  const alertConfig = {
    NOTE: {
      title: 'Note',
      className: styles.alertNote,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    TIP: {
      title: 'Tip',
      className: styles.alertTip,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ),
    },
    IMPORTANT: {
      title: 'Important',
      className: styles.alertImportant,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    WARNING: {
      title: 'Warning',
      className: styles.alertWarning,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    CAUTION: {
      title: 'Caution',
      className: styles.alertCaution,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  };

  const current = alertConfig[type] || alertConfig.NOTE;

  return (
    <div className={`${styles.alertBox} ${current.className}`}>
      <div className={styles.alertHeader}>
        {current.icon}
        <span className={styles.alertTitle}>{current.title}</span>
      </div>
      <div className={styles.alertContent}>
        {body.split('\n').map((line, idx) => (
          <p key={idx}>{renderInline(line)}</p>
        ))}
      </div>
    </div>
  );
}
