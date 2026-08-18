import { cookies } from 'next/headers';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileService } from '@/lib/services/profile.service';
import { ThemeProvider } from '@/components/client/ThemeProvider';
import { PortfolioGallery } from '@/components/client/portfolio/PortfolioGallery';
import styles from '@/components/client/portfolio/portfolio.module.css';

export const revalidate = 0;

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const profileHash = cookieStore.get('__profile')?.value;

  const profile = await ProfileService.getResolvedProfile(profileHash);
  const articles = await PortfolioService.getPublicPortfolioItems({ limit: 100 });

  const authorName = (profile?.basics?.name as string) || profile?.profile?.name || 'Yonatan Elias';
  const themeConfig = profile?.theme || null;

  return (
    <ThemeProvider themeConfig={themeConfig}>
      <div className={styles.portfolioPage}>
        <PortfolioGallery
          articles={articles}
          authorName={authorName}
          hash={profileHash}
        />
      </div>
    </ThemeProvider>
  );
}
