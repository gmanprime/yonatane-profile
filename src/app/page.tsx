import { cookies } from 'next/headers';
import Link from 'next/link';
import { ProfileService } from '@/lib/services/profile.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileRenderer } from '@/components/client/ProfileRenderer';
import styles from './page.module.css';

export const revalidate = 0; // Dynamic server rendering for cookie support

export default async function HomePage() {
  const cookieStore = await cookies();
  const profileHash = cookieStore.get('__profile')?.value;

  const profile = await ProfileService.getResolvedProfile(profileHash);
  const portfolioArticles = await PortfolioService.getPublicPortfolioItems({ limit: 50 });

  if (!profile) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto', padding: '4rem 1.5rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#ffffff',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Yonatan Elias Profile Platform
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Welcome to the personal profile and stealth portfolio platform. No published profiles are configured yet. Log in to the Admin Portal to import your resume dataset and create customized profile links.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link
                href="/admin/login"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                Admin Login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ProfileRenderer
      profile={profile}
      portfolioArticles={portfolioArticles}
      hash={profileHash}
    />
  );
}
