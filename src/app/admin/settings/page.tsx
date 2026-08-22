'use client';

import React, { useState, useEffect } from 'react';
import styles from './settings.module.css';

interface SettingItem {
  key: string;
  value: string | null;
  isSecret: boolean;
  category: string;
  description: string | null;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for core integrations
  const [rxApiKey, setRxApiKey] = useState('');
  const [rxBaseUrl, setRxBaseUrl] = useState('https://rxresu.me');
  const [rxDefaultResumeId, setRxDefaultResumeId] = useState('');
  const [siteUrl, setSiteUrl] = useState('https://yonatanelias.dpdns.org');
  const [showRxKey, setShowRxKey] = useState(false);

  // Custom key form state
  const [customKey, setCustomKey] = useState('');
  const [customVal, setCustomVal] = useState('');
  const [customIsSecret, setCustomIsSecret] = useState(false);
  const [customCategory, setCustomCategory] = useState('general');
  const [customDesc, setCustomDesc] = useState('');

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);

          // Populate core fields if found
          const map = new Map<string, string | null>();
          data.settings.forEach((s: SettingItem) => map.set(s.key, s.value));

          if (map.has('RXRESUME_API_KEY') && map.get('RXRESUME_API_KEY')) {
            setRxApiKey(map.get('RXRESUME_API_KEY') || '');
          }
          if (map.has('RXRESUME_BASE_URL') && map.get('RXRESUME_BASE_URL')) {
            setRxBaseUrl(map.get('RXRESUME_BASE_URL') || 'https://rxresu.me');
          }
          if (map.has('RXRESUME_DEFAULT_RESUME_ID') && map.get('RXRESUME_DEFAULT_RESUME_ID')) {
            setRxDefaultResumeId(map.get('RXRESUME_DEFAULT_RESUME_ID') || '');
          }
          if (map.has('NEXT_PUBLIC_SITE_URL') && map.get('NEXT_PUBLIC_SITE_URL')) {
            setSiteUrl(map.get('NEXT_PUBLIC_SITE_URL') || 'https://yonatanelias.dpdns.org');
          }
        }
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to load settings from database keystore' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSetting = async (
    key: string,
    value: string,
    isSecret: boolean,
    category: string,
    description: string
  ) => {
    try {
      setIsSaving(true);
      setStatusMessage(null);

      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, isSecret, category, description }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save setting');
      }

      setStatusMessage({ type: 'success', text: `Setting "${key}" saved to database successfully.` });
      await fetchSettings();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving setting' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRxIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxApiKey.trim() && !rxApiKey.startsWith('••••')) {
      setStatusMessage({ type: 'error', text: 'RxResume API Key cannot be empty' });
      return;
    }

    try {
      setIsSaving(true);
      if (!rxApiKey.startsWith('••••')) {
        await fetch('/api/v1/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'RXRESUME_API_KEY',
            value: rxApiKey.trim(),
            isSecret: true,
            category: 'integrations',
            description: 'RxResume OpenAPI key for profile sync & PDF downloads',
          }),
        });
      }

      await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'RXRESUME_BASE_URL',
          value: rxBaseUrl.trim() || 'https://rxresu.me',
          isSecret: false,
          category: 'integrations',
          description: 'Host URL for RxResume API',
        }),
      });

      if (rxDefaultResumeId.trim()) {
        await fetch('/api/v1/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'RXRESUME_DEFAULT_RESUME_ID',
            value: rxDefaultResumeId.trim(),
            isSecret: false,
            category: 'integrations',
            description: 'Default RxResume ID for PDF export fallback',
          }),
        });
      }

      setStatusMessage({ type: 'success', text: 'RxResume integration configuration saved to database.' });
      await fetchSettings();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save RxResume settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSetting(
      'NEXT_PUBLIC_SITE_URL',
      siteUrl.trim(),
      false,
      'general',
      'Canonical public domain URL'
    );
  };

  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKey.trim()) return;

    await saveSetting(
      customKey.trim().toUpperCase(),
      customVal.trim(),
      customIsSecret,
      customCategory.trim(),
      customDesc.trim()
    );

    setCustomKey('');
    setCustomVal('');
    setCustomDesc('');
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete setting "${key}"?`)) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/settings?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Setting "${key}" deleted.` });
        await fetchSettings();
      }
    } catch {
      setStatusMessage({ type: 'error', text: `Failed to delete setting "${key}"` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.settingsContainer}>
      {/* Top Header Card */}
      <div className={styles.headerCard}>
        <div>
          <h1 className={styles.headerTitle}>Master Database Keystore</h1>
          <p className={styles.headerDescription}>
            All sensitive API keys and platform configurations are stored securely in PostgreSQL.
          </p>
        </div>
        <div className={styles.headerBadge}>
          <span className={styles.badgeDot} />
          Database Keystore Active
        </div>
      </div>

      {statusMessage && (
        <div
          className={`${styles.statusMessage} ${
            statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <div className={styles.grid}>
        {/* RxResume Integration Card */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2l-2 2m-6 4l3 3m5-5l-3-3m-3 3l-8 8v3h3l8-8z" />
                </svg>
                RxResume API Integration
              </h2>
              <p className={styles.cardSubtitle}>
                Credentials for OpenAPI sync & binary PDF streaming proxy
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveRxIntegration} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>RxResume API Key (x-api-key)</label>
              <div className={styles.inputWrapper}>
                <input
                  type={showRxKey ? 'text' : 'password'}
                  className={`${styles.input} ${styles.inputWithBtn}`}
                  placeholder="Paste your RxResume API key here"
                  value={rxApiKey}
                  onChange={(e) => setRxApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.toggleRevealBtn}
                  onClick={() => setShowRxKey(!showRxKey)}
                  title={showRxKey ? 'Hide Key' : 'Reveal Key'}
                >
                  {showRxKey ? '👁️' : '🔒'}
                </button>
              </div>
              <p className={styles.helperText}>
                Generated in RxResume under Settings &gt; API Keys.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>RxResume Host Base URL</label>
              <input
                type="text"
                className={styles.input}
                placeholder="https://rxresu.me"
                value={rxBaseUrl}
                onChange={(e) => setRxBaseUrl(e.target.value)}
              />
              <p className={styles.helperText}>
                Defaults to <code>https://rxresu.me</code> for cloud, or enter your self-hosted domain.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Default Resume ID (Optional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. cme6f1a8-..."
                value={rxDefaultResumeId}
                onChange={(e) => setRxDefaultResumeId(e.target.value)}
              />
              <p className={styles.helperText}>
                Fallback resume ID for direct <code>/api/v1/public/profile/default/pdf</code> downloads.
              </p>
            </div>

            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Saving to Database...' : 'Save RxResume Settings'}
            </button>
          </form>
        </div>

        {/* General Site Config */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                General Platform Config
              </h2>
              <p className={styles.cardSubtitle}>
                Global canonical domain & environment configuration
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveGeneral} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Canonical Site URL</label>
              <input
                type="text"
                className={styles.input}
                placeholder="https://yonatanelias.dpdns.org"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
              <p className={styles.helperText}>
                Used in OpenGraph tags, sitemap.xml, robots.txt, and QR code generations.
              </p>
            </div>

            <button type="submit" className={styles.saveBtn} disabled={isSaving}>
              {isSaving ? 'Saving to Database...' : 'Save General Settings'}
            </button>
          </form>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--admin-border, #1f2937)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f9fafb', margin: '0 0 0.5rem 0' }}>
              Add Custom Keystore Entry
            </h3>
            <form onSubmit={handleAddCustom} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="KEY_NAME"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Value"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <input
                    type="checkbox"
                    checked={customIsSecret}
                    onChange={(e) => setCustomIsSecret(e.target.checked)}
                  />
                  Mask Secret Value
                </label>
                <button type="submit" className={styles.saveBtn} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginLeft: 'auto' }}>
                  Add Key
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* All Keystore Records Table */}
        <div className={styles.sectionCardFull}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>All Stored Database Keys</h2>
              <p className={styles.cardSubtitle}>
                Complete list of configuration items persisted in PostgreSQL
              </p>
            </div>
            <button
              type="button"
              className={styles.saveBtn}
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              onClick={fetchSettings}
            >
              Refresh
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Category</th>
                  <th>Value</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      Loading database keystore...
                    </td>
                  </tr>
                ) : settings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No settings in database keystore.
                    </td>
                  </tr>
                ) : (
                  settings.map((item) => (
                    <tr key={item.key}>
                      <td className={styles.keyCell}>{item.key}</td>
                      <td>
                        <span className={styles.categoryTag}>{item.category}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>
                        {item.isSecret ? (
                          <span style={{ color: '#9ca3af' }}>{item.value || '••••••••'}</span>
                        ) : (
                          item.value || '<empty>'
                        )}
                      </td>
                      <td style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                        {item.description || '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(item.key)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
