'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

// Helper: Convert ArrayBuffer to base64url string
function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper: Convert base64url string to ArrayBuffer
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Emergency Master TOTP state
  const [showEmergencyTotp, setShowEmergencyTotp] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const totpInputRef = useRef<HTMLInputElement>(null);

  // Master TOTP Password Reset Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTotpCode, setResetTotpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [loadingType, setLoadingType] = useState<'password' | 'passkey' | 'totp' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (showEmergencyTotp && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [showEmergencyTotp]);

  const validatePasswordForm = () => {
    const errors: { email?: string; password?: string } = {};

    if (!email) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validatePasswordForm()) {
      return;
    }

    try {
      setLoadingType('password');

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });

      const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccessMsg('Authentication successful! Redirecting to admin portal...');
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setErrorMsg(message);
    } finally {
      setLoadingType(null);
    }
  };

  const handlePasskeyLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      setErrorMsg('WebAuthn / Passkeys are not supported by your current browser.');
      return;
    }

    try {
      setLoadingType('passkey');

      // 1. Fetch challenge & options from server assertion endpoint
      const optionsRes = await fetch('/api/v1/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });

      const optionsData = await optionsRes.json().catch(() => ({ error: `Server returned status ${optionsRes.status}` }));
      if (!optionsRes.ok || !optionsData.options) {
        throw new Error(optionsData.error || 'Failed to initialize passkey authentication options');
      }

      const { options } = optionsData;

      // Convert challenge from base64url to ArrayBuffer
      const challengeBuffer = base64URLToBuffer(options.challenge);

      // Convert allowCredentials IDs if provided
      const allowCredentials = options.allowCredentials?.map((cred: { id: string; type: PublicKeyCredentialType; transports?: AuthenticatorTransport[] }) => ({
        ...cred,
        id: base64URLToBuffer(cred.id),
      }));

      const assertionOptions: PublicKeyCredentialRequestOptions = {
        ...options,
        challenge: challengeBuffer,
        allowCredentials: allowCredentials || undefined,
      };

      // 2. Invoke WebAuthn assertion (navigator.credentials.get)
      const assertion = (await navigator.credentials.get({
        publicKey: assertionOptions,
      })) as PublicKeyCredential | null;

      if (!assertion) {
        throw new Error('No passkey credential returned by authenticator');
      }

      const assertionResponse = assertion.response as AuthenticatorAssertionResponse;

      // 3. Format payload matching passkeyAssertionSchema
      const credentialPayload = {
        id: assertion.id,
        rawId: bufferToBase64URL(assertion.rawId),
        type: assertion.type,
        response: {
          authenticatorData: bufferToBase64URL(assertionResponse.authenticatorData),
          clientDataJSON: bufferToBase64URL(assertionResponse.clientDataJSON),
          signature: bufferToBase64URL(assertionResponse.signature),
          userHandle: assertionResponse.userHandle ? bufferToBase64URL(assertionResponse.userHandle) : undefined,
        },
      };

      // 4. Verify passkey assertion on server
      const verifyRes = await fetch('/api/v1/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialPayload }),
      });

      const verifyData = await verifyRes.json().catch(() => ({ error: `Server returned status ${verifyRes.status}` }));
      if (!verifyRes.ok || (!verifyData.verified && !verifyData.success)) {
        throw new Error(verifyData.error || 'Passkey verification failed');
      }

      if (verifyData.session) {
        try {
          const supabase = createClient();
          await supabase.auth.setSession({
            access_token: verifyData.session.access_token,
            refresh_token: verifyData.session.refresh_token,
          });
        } catch (sessionSyncErr) {
          console.warn('Browser session sync notice:', sessionSyncErr);
        }
      }

      setSuccessMsg('Passkey verified! Redirecting to admin portal...');
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 400);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setErrorMsg('Passkey prompt was dismissed or canceled.');
      } else {
        const message = err instanceof Error ? err.message : 'Passkey authentication failed.';
        setErrorMsg(message);
      }
    } finally {
      setLoadingType(null);
    }
  };

  const handleTotpAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address to use master TOTP access');
      return;
    }

    const cleanCode = totpCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setErrorMsg('Please enter a valid 6-digit numeric TOTP code');
      return;
    }

    try {
      setLoadingType('totp');

      const res = await fetch('/api/v1/auth/totp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          totpCode: cleanCode,
        }),
      });

      const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));
      if (!res.ok) {
        throw new Error(data.error || 'Master TOTP code verification failed');
      }

      if (data.session) {
        try {
          const supabase = createClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        } catch (sessionSyncErr) {
          console.warn('Browser session sync notice:', sessionSyncErr);
        }
      }

      setSuccessMsg('Emergency master key authenticated! Redirecting...');
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 400);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Master TOTP login failed.';
      setErrorMsg(message);
    } finally {
      setLoadingType(null);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your account email address');
      return;
    }

    const cleanCode = resetTotpCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setErrorMsg('Please enter a valid 6-digit numeric Master TOTP code');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setIsResettingPassword(true);

      const res = await fetch('/api/v1/auth/password/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          totpCode: cleanCode,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));
      if (!res.ok) {
        throw new Error(data.error || 'Password recovery failed');
      }

      setSuccessMsg('Password reset successfully! You can now log in with your new password.');
      setShowResetModal(false);
      setResetTotpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password recovery failed.';
      setErrorMsg(message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!isMounted) {
    return (
      <div className={styles.loginRoot}>
        <div className={styles.ambientGlow} />
        <div className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <div className={styles.logoBadge}>YE</div>
            <h1 className={styles.cardTitle}>Admin Portal</h1>
            <p className={styles.cardSubtitle}>Secure administration & profile management</p>
          </div>
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div className={styles.spinner} style={{ width: '28px', height: '28px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginRoot}>
      <div className={styles.ambientGlow} />

      <div className={styles.loginCard}>
        <div className={styles.cardHeader}>
          <div className={styles.logoBadge}>YE</div>
          <h1 className={styles.cardTitle}>Admin Portal</h1>
          <p className={styles.cardSubtitle}>Secure administration & profile management</p>
        </div>

        {errorMsg && (
          <div className={styles.alertError} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className={styles.alertSuccess} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Passkey Authentication */}
        <div className={styles.authButtonGroup}>
          <button
            type="button"
            className={styles.passkeyButton}
            onClick={handlePasskeyLogin}
            disabled={loadingType !== null}
          >
            {loadingType === 'passkey' ? (
              <div className={styles.spinner} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 2a8 8 0 0 0-8 8c0 1.89.66 3.63 1.76 5L12 22l6.24-7c1.1-1.37 1.76-3.11 1.76-5a8 8 0 0 0-8-8z" />
              </svg>
            )}
            <span>Sign in with Passkey / WebAuthn</span>
          </button>
        </div>

        <div className={styles.divider}>
          <span className={styles.dividerText}>or continue with password</span>
        </div>

        {/* Credentials Form */}
        <form className={styles.form} onSubmit={handlePasswordAuth} noValidate suppressHydrationWarning>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="email">
              Email Address
            </label>
            <div className={styles.inputWrapper} suppressHydrationWarning>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                placeholder="yonatan@yonatanelias.dpdns.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loadingType !== null}
                suppressHydrationWarning
              />
            </div>
            {fieldErrors.email && (
              <span className={styles.errorMessage}>{fieldErrors.email}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrapper} suppressHydrationWarning>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loadingType !== null}
                suppressHydrationWarning
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span className={styles.errorMessage}>{fieldErrors.password}</span>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'none',
                }}
              >
                Forgot password? Reset with Master Key
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loadingType !== null}
          >
            {loadingType === 'password' ? (
              <>
                <div className={styles.spinner} />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In to Admin</span>
            )}
          </button>
        </form>

        {/* Collapsible Emergency Master Access Section */}
        <div className={styles.emergencyContainer}>
          <button
            type="button"
            className={styles.emergencyToggle}
            onClick={() => {
              setShowEmergencyTotp(!showEmergencyTotp);
              setErrorMsg(null);
            }}
            aria-expanded={showEmergencyTotp}
          >
            <div className={styles.emergencyToggleLabel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Emergency Master Access</span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: showEmergencyTotp ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showEmergencyTotp && (
            <div className={styles.emergencyPanel}>
              <p className={styles.emergencyHint}>
                Use your 6-digit rolling TOTP master authenticator code for emergency recovery access. Email above is required.
              </p>
              <form onSubmit={handleTotpAuth} className={styles.emergencyForm}>
                <div className={styles.totpInputGroup}>
                  <input
                    ref={totpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className={styles.totpInput}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTotpCode(val);
                    }}
                    disabled={loadingType !== null}
                  />
                  <button
                    type="submit"
                    className={styles.emergencySubmitBtn}
                    disabled={loadingType !== null || totpCode.length !== 6}
                  >
                    {loadingType === 'totp' ? (
                      <div className={styles.spinner} style={{ width: '14px', height: '14px' }} />
                    ) : (
                      'Verify & Enter'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Reset Password with Master TOTP Modal */}
        {showResetModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: '#0d1322',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc', fontWeight: 600 }}>
                  Reset Password with Master Key
                </h3>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Enter your account email, your 6-digit rolling TOTP master authenticator code, and a new password.
              </p>

              <form onSubmit={handlePasswordRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yonatane504@gmail.com"
                    required
                    style={{
                      width: '100%',
                      background: '#080c16',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.85rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    6-Digit Master TOTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetTotpCode}
                    onChange={(e) => setResetTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    style={{
                      width: '100%',
                      background: '#080c16',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.85rem',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                      letterSpacing: '0.25em',
                      textAlign: 'center',
                      fontSize: '1.1rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    style={{
                      width: '100%',
                      background: '#080c16',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.85rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={8}
                    style={{
                      width: '100%',
                      background: '#080c16',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.85rem',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      padding: '0.65rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword || resetTotpCode.length !== 6 || newPassword.length < 8}
                    style={{
                      flex: 2,
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '0.65rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: (isResettingPassword || resetTotpCode.length !== 6 || newPassword.length < 8) ? 0.6 : 1,
                    }}
                  >
                    {isResettingPassword ? 'Resetting Password...' : 'Reset & Save Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className={styles.cardFooter}>
          <Link href="/" className={styles.backLink}>
            ← Return to Public Portfolio
          </Link>
          <span>Yonatan Elias Personal Profile Platform &copy; 2026</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loginRoot}>
          <div className={styles.ambientGlow} />
          <div className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <div className={styles.logoBadge}>YE</div>
              <h1 className={styles.cardTitle}>Admin Portal</h1>
              <p className={styles.cardSubtitle}>Loading authentication...</p>
            </div>
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div className={styles.spinner} style={{ width: '28px', height: '28px' }} />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
