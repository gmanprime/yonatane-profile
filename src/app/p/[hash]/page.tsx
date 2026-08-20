import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProfileService } from '@/lib/services/profile.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileRenderer } from '@/components/client/ProfileRenderer';
import { PersonJsonLd } from '@/components/seo/JsonLd';
import { extractUrl } from '@/lib/utils/url';

export const revalidate = 0;

interface StealthProfilePageProps {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: StealthProfilePageProps): Promise<Metadata> {
  const { hash } = await params;
  const profile = await ProfileService.getResolvedProfile(hash);
  if (!profile) return { title: 'Profile Not Found' };

  const name = (profile.basics.name as string) || profile.profile.name || 'Yonatan Elias';
  const headline = (profile.basics.headline as string) || profile.profile.name;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';
  const description =
    (profile.summary as string)?.replace(/<[^>]*>?/gm, '').slice(0, 160) ||
    `Personal profile and portfolio view: ${profile.profile.name}.`;

  return {
    title: `${profile.profile.name} — ${name}`,
    description,
    openGraph: {
      title: `${profile.profile.name} — ${name}`,
      description,
      url: `${siteUrl}/p/${hash}`,
      type: 'profile',
      images: [
        {
          url:
            (profile.picture.url as string) ||
            'https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg',
          width: 800,
          height: 800,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.profile.name} — ${name}`,
      description,
      images: [
        (profile.picture.url as string) ||
          'https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg',
      ],
    },
  };
}

export default async function StealthProfilePage({ params }: StealthProfilePageProps) {
  const { hash } = await params;

  const profile = await ProfileService.getResolvedProfile(hash);
  if (!profile) {
    notFound();
  }

  const portfolioArticles = await PortfolioService.getPublicPortfolioItems({ limit: 50 });

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
      const url = extractUrl((item.data as any)?.website || (item.data as any)?.url);
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
        hash={hash}
      />
    </>
  );
}
