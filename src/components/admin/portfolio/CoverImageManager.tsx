'use client';

import React, { useState, useRef } from 'react';
import styles from './metadata.module.css';

interface CoverImageManagerProps {
  coverImageUrl: string | null;
  onChange: (url: string | null) => void;
}

export const CoverImageManager: React.FC<CoverImageManagerProps> = ({
  coverImageUrl,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(coverImageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/portfolio/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      onChange(data.url);
      setUrlInput(data.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    } else {
      onChange(null);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setUrlInput('');
  };

  return (
    <div className={styles.metaControl}>
      <div className={styles.controlHeader}>
        <label className={styles.controlLabel}>
          <span>Article Cover Banner</span>
          <span className={styles.labelHint}>Featured hero image for blog cards and header</span>
        </label>
        <div className={styles.tabPills}>
          <button
            type="button"
            className={`${styles.tabPill} ${activeTab === 'upload' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload File
          </button>
          <button
            type="button"
            className={`${styles.tabPill} ${activeTab === 'url' ? styles.tabPillActive : ''}`}
            onClick={() => setActiveTab('url')}
          >
            Image URL
          </button>
        </div>
      </div>

      {coverImageUrl ? (
        <div className={styles.coverPreviewCard}>
          <div className={styles.coverImageFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImageUrl} alt="Article Cover" className={styles.coverImageSrc} />
          </div>
          <div className={styles.coverCardActions}>
            <span className={styles.coverUrlText}>{coverImageUrl.slice(0, 45)}...</span>
            <div className={styles.coverBtnGroup}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.replaceCoverBtn}
              >
                Replace Image
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className={styles.removeCoverBtn}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'upload' ? (
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''} ${isUploading ? styles.dropzoneUploading : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            className={styles.hiddenFileInput}
          />

          {isUploading ? (
            <div className={styles.uploadingState}>
              <div className={styles.spinner} />
              <span>Uploading image to Supabase Storage...</span>
            </div>
          ) : (
            <div className={styles.dropzonePrompt}>
              <div className={styles.dropIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={styles.dropPrimary}>
                <strong>Click to browse</strong> or drag & drop cover image
              </p>
              <p className={styles.dropSecondary}>PNG, JPG, WEBP, GIF, SVG up to 5MB</p>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.urlInputRow}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className={styles.inputField}
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className={styles.applyUrlBtn}
          >
            Apply URL
          </button>
        </div>
      )}

      {uploadError && <p className={styles.errorText}>⚠ {uploadError}</p>}
    </div>
  );
};
