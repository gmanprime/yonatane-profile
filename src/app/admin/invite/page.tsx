'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './invite.module.css';

interface InviteValidationData {
  valid: boolean;
  email: string;
  role?: string;
  expiresAt?: string;
}

function InviteAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [inviteData, setInviteData] = useState<InviteValidationData | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setTokenError('No invitation token was detected in the URL. Please verify your link or request a new invitation.');
      return;
    }

    let isMounted = true;
    async function validateToken() {
      try {
        setIsValidating(true);
        const res = await fetch('/api/v1/auth/invite/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));

        if (!res.ok || (data.valid === false)) {
          throw new Error(data.error || 'This invitation token is invalid, has expired, or has already been used.');
        }

        if (isMounted) {
          setInviteData({
            valid: true,
            email: data.email || data.invite?.email || 'Authorized User',
            role: data.role || data.invite?.role || 'admin',
            expiresAt: data.expiresAt || data.invite?.expiresAt,
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to validate invitation token.';
          setTokenError(msg);
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    }

    validateToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

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

  const strength = calculatePasswordStrength(password);

  const validateForm = () => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm() || !token) {
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/v1/auth/invite/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      setSuccessMsg('Account registered successfully! Redirecting to admin portal...');
      setTimeout(() => {
        router.push('/admin');
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State 1: Validating token
  if (isValidating) {
    return (
      <div className={styles.inviteRoot}>
        <div className={styles.ambientGlow} />
        <div className={styles.inviteCard}>
          <div className={styles.cardHeader}>
            <div className={styles.logoBadge}>YE</div>
            <h1 className={styles.cardTitle}>Accept Invitation</h1>
            <p className={styles.cardSubtitle}>Validating cryptographic invitation token...</p>
          </div>
          <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div className={styles.spinner} style={{ width: '28px', height: '28px' }} />
          </div>
        </div>
      </div>
    );
  }

  // State 2: Invalid or expired token
  if (tokenError || !inviteData) {
    return (
      <div className={styles.inviteRoot}>
        <div className={styles.ambientGlow} />
        <div className={styles.inviteCard}>
          <div className={styles.cardHeader}>
            <div className={styles.logoBadge}>YE</div>
            <h1 className={styles.cardTitle}>Invitation Invalid</h1>
            <p className={styles.cardSubtitle}>Access authorization check failed</p>
          </div>

          <div className={styles.errorStateContainer}>
            <div className={styles.errorIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className={styles.errorDescription}>
              {tokenError || 'This invitation is not valid or has expired.'}
            </p>
            <Link href="/admin/login" className={styles.actionButton}>
              Go to Admin Login
            </Link>
          </div>

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

  // State 3: Valid invite form
  return (
    <div className={styles.inviteRoot}>
      <div className={styles.ambientGlow} />

      <div className={styles.inviteCard}>
        <div className={styles.cardHeader}>
          <div className={styles.logoBadge}>YE</div>
          <h1 className={styles.cardTitle}>Accept Invitation</h1>
          <p className={styles.cardSubtitle}>Set up your credentials to join the platform</p>
        </div>

        {/* Invited Account Details */}
        <div className={styles.inviteInfoBanner}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Invited Account</div>
            <div className={styles.inviteEmailText}>{inviteData.email}</div>
          </div>
          {inviteData.role && (
            <span className={styles.roleBadge}>{inviteData.role}</span>
          )}
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

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Display Name (Optional) */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="displayName">
              Full Name (Optional)
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="displayName"
                type="text"
                className={styles.input}
                placeholder="e.g. Alex Morgan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="password">
              Password (Min 8 characters)
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
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

            {password && (
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
                  <span>Security Strength:</span>
                  <span style={{ fontWeight: 600 }}>{strength.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            {fieldErrors.confirmPassword && (
              <span className={styles.errorMessage}>{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className={styles.spinner} />
                <span>Activating Account...</span>
              </>
            ) : (
              <span>Complete Registration & Access Admin</span>
            )}
          </button>
        </form>

        <div className={styles.cardFooter}>
          <Link href="/admin/login" className={styles.backLink}>
            ← Already have an account? Sign In
          </Link>
          <span>Yonatan Elias Personal Profile Platform &copy; 2026</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminInvitePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.inviteRoot}>
          <div className={styles.ambientGlow} />
          <div className={styles.inviteCard}>
            <div className={styles.cardHeader}>
              <div className={styles.logoBadge}>YE</div>
              <h1 className={styles.cardTitle}>Admin Invitation</h1>
              <p className={styles.cardSubtitle}>Loading invitation parameters...</p>
            </div>
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div className={styles.spinner} style={{ width: '28px', height: '28px' }} />
            </div>
          </div>
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
