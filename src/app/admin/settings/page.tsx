'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import styles from './settings.module.css';

// ============================================================================
// Types
// ============================================================================

interface SettingItem {
  key: string;
  value: string | null;
  isSecret: boolean;
  category: string;
  description: string | null;
  updatedAt: string;
}

interface EnrolledPasskey {
  id: string;
  deviceName?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface InviteItem {
  id: string;
  email: string;
  role: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  token?: string;
}

interface SecurityEvent {
  id: string;
  eventType: string;
  userEmail?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// WebAuthn Buffer Helpers
// ============================================================================

function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64URLToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function AdminSettingsPage() {
  // Global keystore state
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

  // --------------------------------------------------------------------------
  // Security Section: Change Password
  // --------------------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --------------------------------------------------------------------------
  // Security Section: Passkey Management
  // --------------------------------------------------------------------------
  const [passkeys, setPasskeys] = useState<EnrolledPasskey[]>([]);
  const [passkeyDeviceName, setPasskeyDeviceName] = useState('');
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --------------------------------------------------------------------------
  // Security Section: TOTP Master Key
  // --------------------------------------------------------------------------
  const [isTotpEnrolled, setIsTotpEnrolled] = useState(false);
  const [isLoadingTotp, setIsLoadingTotp] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpMessage, setTotpMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedTotpSecret, setCopiedTotpSecret] = useState(false);

  // --------------------------------------------------------------------------
  // Security Section: Invite Management
  // --------------------------------------------------------------------------
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor'>('admin');
  const [inviteExpiresInHours, setInviteExpiresInHours] = useState('24');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --------------------------------------------------------------------------
  // Security Section: Audit Logs
  // --------------------------------------------------------------------------
  const [securityLogs, setSecurityLogs] = useState<SecurityEvent[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);

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

  const fetchSecurityData = async () => {
    // 1. Fetch passkeys
    try {
      const res = await fetch('/api/v1/auth/passkey');
      if (res.ok) {
        const data = await res.json();
        if (data.passkeys && Array.isArray(data.passkeys)) {
          setPasskeys(data.passkeys);
        }
      }
    } catch {
      // Endpoint may be in development
    }

    // 2. Fetch TOTP status
    try {
      const res = await fetch('/api/v1/auth/totp');
      if (res.ok) {
        const data = await res.json();
        setIsTotpEnrolled(Boolean(data.enrolled));
      }
    } catch {
      // Endpoint may be in development
    }

    // 3. Fetch Invites
    try {
      const res = await fetch('/api/v1/auth/invite');
      if (res.ok) {
        const data = await res.json();
        if (data.invites && Array.isArray(data.invites)) {
          setInvites(data.invites);
        }
      }
    } catch {
      // Endpoint may be in development
    }

    // 4. Fetch Security Audit Logs
    try {
      setIsLoadingLogs(true);
      const res = await fetch('/api/v1/auth/security');
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setSecurityLogs(data.events.slice(0, 50));
        } else if (Array.isArray(data)) {
          setSecurityLogs(data.slice(0, 50));
        }
      }
    } catch {
      // Endpoint may be in development
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchSecurityData();
  }, []);

  // ==========================================================================
  // Handlers: Change Password
  // ==========================================================================

  const calculatePasswordStrength = (pass: string): { score: number; label: string } => {
    if (!pass) return { score: 0, label: 'None' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    const labels = ['Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
    return { score, label: labels[score] || 'Weak' };
  };

  const strength = calculatePasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch('/api/v1/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordMessage({ type: 'error', text: msg });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==========================================================================
  // Handlers: Passkeys
  // ==========================================================================

  const handleRegisterPasskey = async () => {
    setPasskeyMessage(null);

    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      setPasskeyMessage({ type: 'error', text: 'WebAuthn is not supported by your browser.' });
      return;
    }

    try {
      setIsRegisteringPasskey(true);

      // 1. Fetch creation options
      const optRes = await fetch('/api/v1/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: passkeyDeviceName.trim() || undefined }),
      });

      const optData = await optRes.json().catch(() => ({ error: `Server error ${optRes.status}` }));
      if (!optRes.ok || !optData.options) {
        throw new Error(optData.error || 'Failed to get passkey registration options');
      }

      const { options } = optData;

      const challengeBuffer = base64URLToBuffer(options.challenge);
      const userIdBuffer = base64URLToBuffer(options.user.id);

      const excludeCredentials = options.excludeCredentials?.map((cred: { id: string; type: PublicKeyCredentialType }) => ({
        ...cred,
        id: base64URLToBuffer(cred.id),
      }));

      const creationOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: challengeBuffer,
        user: {
          ...options.user,
          id: userIdBuffer,
        },
        excludeCredentials: excludeCredentials || undefined,
      };

      // 2. Invoke WebAuthn create ceremony
      const credential = (await navigator.credentials.create({
        publicKey: creationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Authenticator did not return a credential.');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      const payload = {
        id: credential.id,
        rawId: bufferToBase64URL(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64URL(attestationResponse.clientDataJSON),
          attestationObject: bufferToBase64URL(attestationResponse.attestationObject),
        },
      };

      // 3. Verify on server
      const verifyRes = await fetch('/api/v1/auth/passkey/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: payload,
          deviceName: passkeyDeviceName.trim() || undefined,
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({ error: `Server error ${verifyRes.status}` }));
      if (!verifyRes.ok || (!verifyData.verified && !verifyData.success)) {
        throw new Error(verifyData.error || 'Passkey verification failed');
      }

      setPasskeyMessage({ type: 'success', text: 'New passkey registered successfully!' });
      setPasskeyDeviceName('');

      // Refresh passkeys list
      const listRes = await fetch('/api/v1/auth/passkey');
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.passkeys) setPasskeys(listData.passkeys);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPasskeyMessage({ type: 'error', text: 'Passkey registration prompt was canceled or timed out.' });
      } else {
        const msg = err instanceof Error ? err.message : 'Passkey registration failed.';
        setPasskeyMessage({ type: 'error', text: msg });
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('Are you sure you want to remove this passkey?')) return;

    try {
      const res = await fetch(`/api/v1/auth/passkey?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPasskeys((prev) => prev.filter((p) => p.id !== id));
        setPasskeyMessage({ type: 'success', text: 'Passkey removed.' });
      } else {
        setPasskeyMessage({ type: 'error', text: 'Failed to delete passkey.' });
      }
    } catch {
      setPasskeyMessage({ type: 'error', text: 'Error communicating with passkey service.' });
    }
  };

  // ==========================================================================
  // Handlers: TOTP Master Key
  // ==========================================================================

  const handleStartTotpEnrollment = async () => {
    setTotpMessage(null);
    try {
      setIsLoadingTotp(true);
      const res = await fetch('/api/v1/auth/totp', { method: 'POST' });
      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize TOTP secret');
      }

      const otpauthUrl = data.otpauthUrl || data.uri || `otpauth://totp/ProfileAdmin:root?secret=${data.secret}&issuer=ProfileAdmin`;
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      setTotpSetupData({
        secret: data.secret,
        qrCodeDataUrl,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start TOTP setup';
      setTotpMessage({ type: 'error', text: msg });
    } finally {
      setIsLoadingTotp(false);
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpMessage(null);

    const code = totpVerifyCode.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setTotpMessage({ type: 'error', text: 'Please enter a 6-digit numeric TOTP code.' });
      return;
    }

    try {
      setIsLoadingTotp(true);
      const res = await fetch('/api/v1/auth/totp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: code }),
      });

      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      if (!res.ok) {
        throw new Error(data.error || 'Invalid TOTP code verification');
      }

      setIsTotpEnrolled(true);
      setTotpSetupData(null);
      setTotpVerifyCode('');
      setTotpMessage({ type: 'success', text: 'Master TOTP authenticator key activated successfully!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify TOTP code';
      setTotpMessage({ type: 'error', text: msg });
    } finally {
      setIsLoadingTotp(false);
    }
  };

  // ==========================================================================
  // Handlers: Invites
  // ==========================================================================

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMessage(null);
    setGeneratedInviteUrl(null);
    setCopiedInviteUrl(false);

    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteMessage({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }

    try {
      setIsCreatingInvite(true);
      const res = await fetch('/api/v1/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          expiresInHours: Number(inviteExpiresInHours),
        }),
      });

      const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate invitation');
      }

      const token = data.invite?.token || data.token;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = data.inviteUrl || `${origin}/admin/invite?token=${token}`;

      setGeneratedInviteUrl(fullUrl);
      setInviteMessage({ type: 'success', text: 'Invitation generated successfully!' });
      setInviteEmail('');

      // Refresh invites list
      const listRes = await fetch('/api/v1/auth/invite');
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.invites) setInvites(listData.invites);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating invite link';
      setInviteMessage({ type: 'error', text: msg });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      const res = await fetch(`/api/v1/auth/invite?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInvites((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: 'revoked' as const } : inv))
        );
        setInviteMessage({ type: 'success', text: 'Invitation revoked.' });
      } else {
        setInviteMessage({ type: 'error', text: 'Failed to revoke invite.' });
      }
    } catch {
      setInviteMessage({ type: 'error', text: 'Error communicating with invite service.' });
    }
  };

  // ==========================================================================
  // Handlers: Existing Keystore
  // ==========================================================================

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving setting';
      setStatusMessage({ type: 'error', text: msg });
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save RxResume settings';
      setStatusMessage({ type: 'error', text: msg });
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

  const handleDeleteKeystoreKey = async (key: string) => {
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

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={styles.settingsContainer}>
      {/* Top Header Card */}
      <div className={styles.headerCard}>
        <div>
          <h1 className={styles.headerTitle}>Security & Keystore Architecture</h1>
          <p className={styles.headerDescription}>
            Manage cryptographic credentials, WebAuthn passkeys, emergency TOTP access, and platform integrations.
          </p>
        </div>
        <div className={styles.headerBadge}>
          <span className={styles.badgeDot} />
          Multi-Factor Protected
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

      {/* ================================================================== */}
      {/* SECTION 1: SECURITY & ACCESS CONTROL                               */}
      {/* ================================================================== */}
      <div>
        <h2 className={styles.sectionCategoryTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Security & Access Control
        </h2>
        <p className={styles.sectionCategoryDesc}>
          Zero-trust credential policies, hardware biometric authentication, and operator audit trails.
        </p>
      </div>

      <div className={styles.grid}>
        {/* Card A: Change Password */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Change Password
              </h3>
              <p className={styles.cardSubtitle}>Update your primary admin sign-in password</p>
            </div>
          </div>

          {passwordMessage && (
            <div
              className={`${styles.statusMessage} ${
                passwordMessage.type === 'success' ? styles.statusSuccess : styles.statusError
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Current Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>New Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              {newPassword && (
                <div className={styles.strengthMeter}>
                  <div className={styles.strengthBars}>
                    <div
                      className={`${styles.strengthSegment} ${
                        strength.score >= 1 ? styles.strengthSegmentActiveWeak : ''
                      }`}
                    />
                    <div
                      className={`${styles.strengthSegment} ${
                        strength.score >= 2 ? styles.strengthSegmentActiveMedium : ''
                      }`}
                    />
                    <div
                      className={`${styles.strengthSegment} ${
                        strength.score >= 3 ? styles.strengthSegmentActiveStrong : ''
                      }`}
                    />
                    <div
                      className={`${styles.strengthSegment} ${
                        strength.score >= 4 ? styles.strengthSegmentActiveVeryStrong : ''
                      }`}
                    />
                  </div>
                  <div className={styles.strengthLabel}>
                    <span>Password Strength:</span>
                    <span style={{ fontWeight: 600 }}>{strength.label}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm New Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className={styles.saveBtn} disabled={isChangingPassword}>
              {isChangingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Card C: TOTP Master Key */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                Emergency Master TOTP
              </h3>
              <p className={styles.cardSubtitle}>Hardware authenticator fallback for emergency root access</p>
            </div>
            {isTotpEnrolled && (
              <span className={styles.activeBadge}>
                <span className={styles.badgeDot} />
                Active
              </span>
            )}
          </div>

          {totpMessage && (
            <div
              className={`${styles.statusMessage} ${
                totpMessage.type === 'success' ? styles.statusSuccess : styles.statusError
              }`}
            >
              {totpMessage.text}
            </div>
          )}

          {isTotpEnrolled && !totpSetupData && (
            <div className={styles.totpActiveCard}>
              <div className={styles.totpStatusRow}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>
                    Master TOTP Protected
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Enrolled authenticator application generates 6-digit rolling codes accepted during root recovery sign-in.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleStartTotpEnrollment}
                disabled={isLoadingTotp}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                {isLoadingTotp ? 'Preparing Generator...' : 'Regenerate Master Key'}
              </button>
            </div>
          )}

          {!isTotpEnrolled && !totpSetupData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p className={styles.helperText} style={{ fontSize: '0.8125rem' }}>
                Configure a rolling TOTP authenticator (Google Authenticator, 1Password, Aegis) as a secure emergency master backdoor.
              </p>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleStartTotpEnrollment}
                disabled={isLoadingTotp}
              >
                {isLoadingTotp ? 'Generating Seed...' : 'Enable Master TOTP'}
              </button>
            </div>
          )}

          {totpSetupData && (
            <div className={styles.totpSetupBox}>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                1. Scan this QR code in your Authenticator app:
              </div>
              <div className={styles.totpQrWrapper}>
                <img
                  src={totpSetupData.qrCodeDataUrl}
                  alt="TOTP Enrollment QR Code"
                  className={styles.totpQrImage}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Manual Setup Key:
              </div>
              <div className={styles.secretBox}>
                <span>{totpSetupData.secret}</span>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(totpSetupData.secret);
                    setCopiedTotpSecret(true);
                    setTimeout(() => setCopiedTotpSecret(false), 2000);
                  }}
                >
                  {copiedTotpSecret ? 'Copied!' : 'Copy Key'}
                </button>
              </div>

              <form onSubmit={handleConfirmTotp} className={styles.totpConfirmForm}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className={`${styles.input} ${styles.inputMonospace}`}
                  placeholder="Enter 6-digit code"
                  value={totpVerifyCode}
                  onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoadingTotp}
                />
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isLoadingTotp || totpVerifyCode.length !== 6}
                >
                  {isLoadingTotp ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Card B: Passkey Management */}
        <div className={styles.sectionCardFull}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 2a8 8 0 0 0-8 8c0 1.89.66 3.63 1.76 5L12 22l6.24-7c1.1-1.37 1.76-3.11 1.76-5a8 8 0 0 0-8-8z" />
                </svg>
                Passkey & FIDO2 Security Keys
              </h3>
              <p className={styles.cardSubtitle}>
                Manage phishing-resistant WebAuthn biometric credentials and hardware security keys
              </p>
            </div>
          </div>

          {passkeyMessage && (
            <div
              className={`${styles.statusMessage} ${
                passkeyMessage.type === 'success' ? styles.statusSuccess : styles.statusError
              }`}
            >
              {passkeyMessage.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className={styles.input}
              style={{ maxWidth: '300px' }}
              placeholder="Device Name (e.g. Touch ID, YubiKey)"
              value={passkeyDeviceName}
              onChange={(e) => setPasskeyDeviceName(e.target.value)}
              disabled={isRegisteringPasskey}
            />
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleRegisterPasskey}
              disabled={isRegisteringPasskey}
            >
              {isRegisteringPasskey ? (
                'Waiting for Authenticator...'
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Register New Passkey
                </>
              )}
            </button>
          </div>

          {/* Passkeys List */}
          <div className={styles.passkeyList}>
            {passkeys.length === 0 ? (
              <div className={styles.emptyState}>
                No passkeys enrolled yet. Add Touch ID, Windows Hello, or a YubiKey for instant passwordless sign-in.
              </div>
            ) : (
              passkeys.map((p) => (
                <div key={p.id} className={styles.passkeyItem}>
                  <div className={styles.passkeyInfo}>
                    <div className={styles.passkeyName}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="10" r="3" />
                        <path d="M12 2a8 8 0 0 0-8 8c0 1.89.66 3.63 1.76 5L12 22l6.24-7c1.1-1.37 1.76-3.11 1.76-5a8 8 0 0 0-8-8z" />
                      </svg>
                      {p.deviceName || 'Enrolled WebAuthn Credential'}
                    </div>
                    <div className={styles.passkeyMeta}>
                      Created: {new Date(p.createdAt).toLocaleDateString()} &bull; Last Used:{' '}
                      {p.lastUsedAt ? new Date(p.lastUsedAt).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDeletePasskey(p.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card D: Admin Invites Management */}
        <div className={styles.sectionCardFull}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Invite-Gated Access Control
              </h3>
              <p className={styles.cardSubtitle}>
                Generate cryptographically signed invite tokens to onboard team members without public signup
              </p>
            </div>
          </div>

          {inviteMessage && (
            <div
              className={`${styles.statusMessage} ${
                inviteMessage.type === 'success' ? styles.statusSuccess : styles.statusError
              }`}
            >
              {inviteMessage.text}
            </div>
          )}

          {/* Generate Invite Form */}
          <form onSubmit={handleCreateInvite} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Recipient Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="colleague@domain.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isCreatingInvite}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Assigned Role</label>
              <select
                className={styles.selectInput}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor')}
                disabled={isCreatingInvite}
              >
                <option value="admin">Administrator (Full Access)</option>
                <option value="editor">Editor (Content Datasets Only)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expires In</label>
              <select
                className={styles.selectInput}
                value={inviteExpiresInHours}
                onChange={(e) => setInviteExpiresInHours(e.target.value)}
                disabled={isCreatingInvite}
              >
                <option value="1">1 Hour</option>
                <option value="6">6 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="48">48 Hours (2 Days)</option>
                <option value="168">7 Days (1 Week)</option>
              </select>
            </div>

            <div>
              <button type="submit" className={styles.saveBtn} disabled={isCreatingInvite} style={{ width: '100%' }}>
                {isCreatingInvite ? 'Creating Token...' : 'Generate Invite Link'}
              </button>
            </div>
          </form>

          {/* Display Generated Invite Link */}
          {generatedInviteUrl && (
            <div className={styles.inviteUrlBanner}>
              <div className={styles.inviteUrlTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Active Invitation Link:
              </div>
              <div className={styles.inviteUrlInputRow}>
                <input
                  type="text"
                  readOnly
                  value={generatedInviteUrl}
                  className={`${styles.input} ${styles.inputMonospace}`}
                  style={{ background: 'rgba(0, 0, 0, 0.4)' }}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteUrl);
                    setCopiedInviteUrl(true);
                    setTimeout(() => setCopiedInviteUrl(false), 2000);
                  }}
                >
                  {copiedInviteUrl ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}

          {/* Invites Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invited Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
                      No active or historical invitations found.
                    </td>
                  </tr>
                ) : (
                  invites.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 500 }}>{inv.email}</td>
                      <td>
                        <span className={styles.categoryTag}>{inv.role}</span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            inv.status === 'active'
                              ? styles.badgeActive
                              : inv.status === 'used'
                              ? styles.badgeUsed
                              : inv.status === 'expired'
                              ? styles.badgeExpired
                              : styles.badgeRevoked
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(inv.expiresAt).toLocaleString()}
                      </td>
                      <td>
                        {inv.status === 'active' && (
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleRevokeInvite(inv.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card E: Security Audit Logs */}
        <div className={styles.sectionCardFull}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Security Audit Log
              </h3>
              <p className={styles.cardSubtitle}>
                Real-time security telemetry, authentication attempts, and authorization modifications (Last 50 events)
              </p>
            </div>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={fetchSecurityData}
              disabled={isLoadingLogs}
            >
              Refresh Logs
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>User / Target</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
                      Loading audit events...
                    </td>
                  </tr>
                ) : securityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af' }}>
                      No recent security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  securityLogs.map((log) => {
                    const isFailure =
                      log.eventType.includes('FAIL') ||
                      log.eventType.includes('REVOKE') ||
                      log.eventType.includes('ERROR');
                    const isSuccess =
                      log.eventType.includes('SUCCESS') ||
                      log.eventType.includes('LOGIN') ||
                      log.eventType.includes('VERIF');
                    return (
                      <tr key={log.id}>
                        <td>
                          <span
                            className={`${styles.eventBadge} ${
                              isFailure
                                ? styles.eventBadgeFailure
                                : isSuccess
                                ? styles.eventBadgeSuccess
                                : ''
                            }`}
                          >
                            {log.eventType}
                          </span>
                        </td>
                        <td style={{ color: '#f1f5f9' }}>{log.userEmail || 'Anonymous / System'}</td>
                        <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                          {log.ipAddress || '—'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: INTEGRATIONS & DATABASE KEYSTORE (PRESERVED)           */}
      {/* ================================================================== */}
      <div style={{ marginTop: '1rem' }}>
        <h2 className={styles.sectionCategoryTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          Integrations & Database Keystore
        </h2>
        <p className={styles.sectionCategoryDesc}>
          External service connections, API keys, and platform environment variables stored securely in PostgreSQL.
        </p>
      </div>

      <div className={styles.grid}>
        {/* RxResume Integration Card */}
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2l-2 2m-6 4l3 3m5-5l-3-3m-3 3l-8 8v3h3l8-8z" />
                </svg>
                RxResume API Integration
              </h3>
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
              <h3 className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                General Platform Config
              </h3>
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
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f9fafb', margin: '0 0 0.5rem 0' }}>
              Add Custom Keystore Entry
            </h4>
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
              <h3 className={styles.cardTitle}>All Stored Database Keys</h3>
              <p className={styles.cardSubtitle}>
                Complete list of configuration items persisted in PostgreSQL
              </p>
            </div>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={fetchSettings}
            >
              Refresh Keystore
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
                          onClick={() => handleDeleteKeystoreKey(item.key)}
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
