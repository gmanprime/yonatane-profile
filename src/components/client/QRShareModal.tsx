'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { generateVCard, downloadVCardFile } from '@/lib/utils/vcard';
import styles from './client.module.css';

interface QRShareModalProps {
  url: string;
  name: string;
  basics?: Record<string, unknown>;
  summary?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({
  url,
  name,
  basics = {},
  summary = '',
  isOpen,
  onClose,
}) => {
  const [qrMode, setQrMode] = useState<'vcard' | 'url'>('vcard');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Extract contact fields from basics & customFields
  const contactDetails = useMemo(() => {
    const headline = (basics.headline as string) || '';
    const email = (basics.email as string) || '';
    const phone = (basics.phone as string) || '';
    const location = (basics.location as string) || '';
    const websiteObj = basics.website as { url?: string; label?: string } | string | undefined;
    const websiteUrl = typeof websiteObj === 'object' ? websiteObj?.url : websiteObj;

    const customFields = (basics.customFields as Array<Record<string, unknown>>) || [];
    let birthday = '';
    let addressState = location;

    for (const cf of customFields) {
      const text = (cf.text as string) || '';
      const icon = (cf.icon as string) || '';
      if (icon.includes('calendar') || text.toLowerCase().includes('may') || text.toLowerCase().includes('born')) {
        birthday = text;
      }
      if (icon.includes('compass') || icon.includes('map') || text.toLowerCase().includes('maryland') || text.toLowerCase().includes('silver spring')) {
        addressState = text;
      }
    }

    return {
      name: name || 'Yonatan Elias',
      headline,
      email,
      phone,
      location,
      addressState,
      websiteUrl: url || websiteUrl,
      githubUrl: typeof websiteUrl === 'string' && websiteUrl.includes('github') ? websiteUrl : undefined,
      birthday,
      company: 'Independent / Open to Opportunities',
      title: headline || 'Computational Data Scientist & Systems Engineer',
      note: summary ? summary.slice(0, 300) : 'Computational Data Scientist & Systems Engineer',
    };
  }, [name, basics, summary, url]);

  // Generate standard vCard 3.0 text
  const vcardText = useMemo(() => {
    return generateVCard(contactDetails);
  }, [contactDetails]);

  // Generate QR Code from either vCard string or Web URL
  useEffect(() => {
    if (!isOpen) return;

    const targetData = qrMode === 'vcard' ? vcardText : url;

    QRCode.toDataURL(targetData, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, qrMode, vcardText, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = qrMode === 'vcard' ? vcardText : url;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadVCard = () => {
    const safeName = (name || 'Yonatan_Elias').replace(/[^a-zA-Z0-9]/g, '_');
    downloadVCardFile(vcardText, `${safeName}_Contact.vcf`);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${qrMode}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} | Contact & Profile`,
          text: `Contact card for ${name} — ${contactDetails.headline}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <button
          type="button"
          onClick={onClose}
          className={styles.modalCloseBtn}
          aria-label="Close contact share modal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          {qrMode === 'vcard' ? 'Add Contact to Phone' : 'Share Profile Link'}
        </h3>

        {/* QR Mode Switcher: vCard vs Web URL */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          <div className={styles.vcardTypeSwitcher} role="group" aria-label="QR Code Mode">
            <button
              type="button"
              className={`${styles.vcardTypeBtn} ${qrMode === 'vcard' ? styles.vcardTypeBtnActive : ''}`}
              onClick={() => setQrMode('vcard')}
              aria-pressed={qrMode === 'vcard'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span>Phone Contact (vCard)</span>
            </button>

            <button
              type="button"
              className={`${styles.vcardTypeBtn} ${qrMode === 'url' ? styles.vcardTypeBtnActive : ''}`}
              onClick={() => setQrMode('url')}
              aria-pressed={qrMode === 'url'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Website URL</span>
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--theme-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
          {qrMode === 'vcard'
            ? 'Scan with your mobile camera to instantly add Yonatan as a contact with full details, or download the vCard (.vcf) file.'
            : 'Scan QR code or copy the link to open this profile on any device.'}
        </p>

        {/* QR Code Container (Clicking downloads the vCard or QR) */}
        {qrDataUrl && (
          <div
            className={styles.qrContainer}
            onClick={qrMode === 'vcard' ? handleDownloadVCard : handleDownloadQR}
            style={{ cursor: 'pointer' }}
            title={qrMode === 'vcard' ? 'Click to download .vcf contact card' : 'Click to save QR image'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`${name}'s ${qrMode === 'vcard' ? 'Contact Card' : 'Profile'} QR Code`} width={190} height={190} />
          </div>
        )}

        {/* Contact Details Preview Box */}
        {qrMode === 'vcard' && (
          <div className={styles.vcardContactCardPreview}>
            <div className={styles.vcardPreviewItem}>
              <strong>{contactDetails.name}</strong> &middot; <span>{contactDetails.headline}</span>
            </div>
            {contactDetails.phone && (
              <div className={styles.vcardPreviewItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                <span>{contactDetails.phone}</span>
              </div>
            )}
            {contactDetails.email && (
              <div className={styles.vcardPreviewItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <span>{contactDetails.email}</span>
              </div>
            )}
            {contactDetails.location && (
              <div className={styles.vcardPreviewItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <span>{contactDetails.addressState || contactDetails.location}</span>
              </div>
            )}
          </div>
        )}

        {/* Web URL display if in URL mode */}
        {qrMode === 'url' && (
          <div className={styles.qrUrlBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className={styles.qrUrlText}>{url}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {qrMode === 'vcard' ? (
            <button
              type="button"
              onClick={handleDownloadVCard}
              className={styles.primaryActionBtn}
              style={{ fontSize: '0.825rem', padding: '0.55rem 1rem' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Contact (.vcf)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCopy}
              className={styles.primaryActionBtn}
              style={{ fontSize: '0.825rem', padding: '0.55rem 1rem' }}
            >
              {copied ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadQR}
            className={styles.secondaryActionBtn}
            style={{ fontSize: '0.825rem', padding: '0.55rem 0.85rem' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Save QR Image</span>
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className={styles.secondaryActionBtn}
              style={{ fontSize: '0.825rem', padding: '0.55rem 0.85rem' }}
              title="Share via device menu"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
