import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileService } from '@/lib/services/profile.service';
import { ThemeProvider } from '@/components/client/ThemeProvider';
import { PortfolioGallery } from '@/components/client/portfolio/PortfolioGallery';
import styles from '@/components/client/portfolio/portfolio.module.css';

export const revalidate = 0;

interface StealthPortfolioPageProps {
  params: Promise<{ hash: string }>;
}

export async function generateMetadata({ params }: StealthPortfolioPageProps): Promise<Metadata> {
  const { hash } = await params;
  const profile = await ProfileService.getResolvedProfile(hash);

  if (!profile) {
    return { title: 'Profile Not Found' };
  }

  const authorName = (profile.basics.name as string) || profile.profile.name || 'Yonatan Elias';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

  return {
    title: `Engineering Portfolio — ${profile.profile.name} | ${authorName}`,
    description: `Technical projects and portfolio articles for ${profile.profile.name}.`,
    openGraph: {
      title: `Engineering Portfolio — ${profile.profile.name} | ${authorName}`,
      description: `Technical projects and portfolio articles for ${profile.profile.name}.`,
      url: `${siteUrl}/p/${hash}/blog`,
      type: 'website',
    },
  };
}

export default async function StealthPortfolioPage({ params }: StealthPortfolioPageProps) {
  const { hash } = await params;

  const [profile, articles] = await Promise.all([
    ProfileService.getResolvedProfile(hash),
    PortfolioService.getPublicPortfolioItems({ limit: 100 }),
  ]);

  if (!profile) {
    notFound();
  }

  const authorName = (profile.basics.name as string) || profile.profile.name || 'Yonatan Elias';

  return (
    <ThemeProvider themeConfig={profile.theme}>
      <div className={styles.portfolioPage}>
        <PortfolioGallery
          articles={articles}
          authorName={authorName}
          hash={hash}
        />
      </div>
    </ThemeProvider>
  );
}
