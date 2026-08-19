'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';

const ALLOWED_ADMIN_EMAILS = ['yonatane504@gmail.com', 'yonatan@yonatanelias.dpdns.org'];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('Yonatan Elias');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [loadingType, setLoadingType] = useState<'password' | 'google' | 'passkey' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const validateForm = () => {
    const errors: { email?: string; password?: string; displayName?: string } = {};

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

    if (authMode === 'signup' && (!displayName || displayName.trim().length < 2)) {
      errors.displayName = 'Display name must be at least 2 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoadingType('password');

      if (authMode === 'signup') {
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), password, displayName }),
        });

        const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        setSuccessMsg(data.message || 'Account created successfully! Redirecting...');
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 1000);
      } else {
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
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      setErrorMsg(message);
    } finally {
      setLoadingType(null);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setLoadingType('google');
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectTo: `${window.location.origin}/api/v1/auth/callback?next=${encodeURIComponent(redirectTo)}` }),
      });

      const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to initialize Google OAuth');
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
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

      // 1. Fetch challenge & options from server
      const optionsRes = await fetch('/api/v1/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined }),
      });

      const optionsData = await optionsRes.json().catch(() => ({ error: `Server returned status ${optionsRes.status}` }));
      if (!optionsRes.ok || !optionsData.options) {
        throw new Error(optionsData.error || 'Failed to fetch passkey challenge');
      }

      const { options } = optionsData;

      // Convert base64url challenge & user id to Uint8Array buffer
      const challengeBuffer = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
      const userIdBuffer = Uint8Array.from(atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

      const creationOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: challengeBuffer,
        user: {
          ...options.user,
          id: userIdBuffer,
        },
      };

      // 2. Invoke WebAuthn browser API
      const credential = (await navigator.credentials.create({
        publicKey: creationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No passkey credential returned by authenticator');
      }

      // 3. Verify passkey on server
      const verifyRes = await fetch('/api/v1/auth/passkey/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: credential.id,
            type: credential.type,
          },
        }),
      });

      const verifyData = await verifyRes.json().catch(() => ({ error: `Server returned status ${verifyRes.status}` }));
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.error || 'Passkey verification failed');
      }

      setSuccessMsg('Passkey verified! Redirecting to admin portal...');
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 600);
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
          <p className={styles.cardSubtitle}>
            {authMode === 'signup'
              ? 'Create your administrator credentials'
              : 'Secure administration & profile management'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabButton} ${authMode === 'signin' ? styles.activeTab : ''}`}
            onClick={() => {
              setAuthMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
              setFieldErrors({});
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${authMode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
              setFieldErrors({});
            }}
          >
            Sign Up
          </button>
        </div>

        {authMode === 'signup' && (
          <div className={styles.adminNotice}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Admin account creation for authorized platform users</span>
          </div>
        )}

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

        {/* Quick OAuth & Passkey Authentication */}
        {authMode === 'signin' && (
          <>
            <div className={styles.authButtonGroup}>
              <button
                type="button"
                className={styles.oauthButton}
                onClick={handleGoogleLogin}
                disabled={loadingType !== null}
              >
                {loadingType === 'google' ? (
                  <div className={styles.spinner} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

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
              <span className={styles.dividerText}>or sign in with password</span>
            </div>
          </>
        )}

        {/* Credentials Form */}
        <form className={styles.form} onSubmit={handlePasswordAuth} noValidate suppressHydrationWarning>
          {authMode === 'signup' && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="displayName">
                Full Name
              </label>
              <div className={styles.inputWrapper} suppressHydrationWarning>
                <input
                  id="displayName"
                  type="text"
                  className={`${styles.input} ${fieldErrors.displayName ? styles.inputError : ''}`}
                  placeholder="Yonatan Elias"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  disabled={loadingType !== null}
                  suppressHydrationWarning
                />
              </div>
              {fieldErrors.displayName && (
                <span className={styles.errorMessage}>{fieldErrors.displayName}</span>
              )}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="email">
              Email Address
            </label>
            <div className={styles.inputWrapper} suppressHydrationWarning>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                placeholder={authMode === 'signup' ? 'yonatane504@gmail.com' : 'yonatan@yonatanelias.dpdns.org'}
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
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
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
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loadingType !== null}
          >
            {loadingType === 'password' ? (
              <>
                <div className={styles.spinner} />
                <span>{authMode === 'signup' ? 'Creating Administrator Account...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{authMode === 'signup' ? 'Register Admin Account' : 'Sign In to Admin'}</span>
            )}
          </button>
        </form>

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

