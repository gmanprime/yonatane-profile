import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProfileService } from '@/lib/services/profile.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileRenderer } from '@/components/client/ProfileRenderer';
import { PersonJsonLd } from '@/components/seo/JsonLd';
import styles from './page.module.css';

export const revalidate = 0; // Dynamic server rendering for cookie support

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const profileHash = cookieStore.get('__profile')?.value;
  const profile = await ProfileService.getResolvedProfile(profileHash);

  const name = (profile?.basics?.name as string) || profile?.profile?.name || 'Yonatan Elias';
  const headline = (profile?.basics?.headline as string) || 'Computational Data Scientist & Full-Stack Developer';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';
  const description =
    (profile?.summary as string)?.replace(/<[^>]*>?/gm, '').slice(0, 160) ||
    `Personal profile, engineering portfolio, and technical case studies of ${name}.`;

  return {
    title: `${name} | ${headline}`,
    description,
    openGraph: {
      title: `${name} | ${headline}`,
      description,
      url: siteUrl,
      type: 'website',
      siteName: 'Yonatan Elias Profile Platform',
      images: [
        {
          url:
            (profile?.picture?.url as string) ||
            'https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg',
          width: 800,
          height: 800,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | ${headline}`,
      description,
      images: [
        (profile?.picture?.url as string) ||
          'https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg',
      ],
    },
  };
}

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

  // Extract skills & education for JSON-LD Person schema
  const skillsSec = profile.sections.find((s) => s.type === 'skills');
  const allSkills: string[] = [];
  if (skillsSec) {
    for (const item of skillsSec.items) {
      const kw = (item.data as any)?.keywords;
      if (Array.isArray(kw)) {
        allSkills.push(...kw);
      }
    }
  }

  const eduSec = profile.sections.find((s) => s.type === 'education');
  const alumniList: string[] = [];
  if (eduSec) {
    for (const item of eduSec.items) {
      const school = (item.data as any)?.school;
      if (school) alumniList.push(school);
    }
  }

  const profSec = profile.sections.find((s) => s.type === 'profiles');
  const socialLinks: string[] = [];
  if (profSec) {
    for (const item of profSec.items) {
      const url = (item.data as any)?.website?.url;
      if (url) socialLinks.push(url);
    }
  }

  return (
    <>
      <PersonJsonLd
        name={(profile.basics.name as string) || 'Yonatan Elias'}
        headline={(profile.basics.headline as string) || undefined}
        email={(profile.basics.email as string) || undefined}
        telephone={(profile.basics.phone as string) || undefined}
        address={(profile.basics.location as string) || undefined}
        image={(profile.picture.url as string) || undefined}
        sameAs={socialLinks}
        skills={allSkills}
        alumniOf={alumniList}
      />
      <ProfileRenderer
        profile={profile}
        portfolioArticles={portfolioArticles}
        hash={profileHash}
      />
    </>
  );
}
