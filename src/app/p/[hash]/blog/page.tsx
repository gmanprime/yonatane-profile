import { notFound } from 'next/navigation';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileService } from '@/lib/services/profile.service';
import { ThemeProvider } from '@/components/client/ThemeProvider';
import { PortfolioGallery } from '@/components/client/portfolio/PortfolioGallery';
import styles from '@/components/client/portfolio/portfolio.module.css';

export const revalidate = 0;

interface StealthBlogGalleryPageProps {
  params: Promise<{ hash: string }>;
}

export default async function StealthBlogGalleryPage({ params }: StealthBlogGalleryPageProps) {
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
