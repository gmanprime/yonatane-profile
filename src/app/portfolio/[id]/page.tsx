import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileService } from '@/lib/services/profile.service';
import { ThemeProvider } from '@/components/client/ThemeProvider';
import { ArticleReader } from '@/components/client/portfolio/ArticleReader';
import { type ExternalLinkItem } from '@/components/admin/portfolio/ExternalLinksManager';
import styles from '@/components/client/portfolio/portfolio.module.css';

export const revalidate = 0;

interface PortfolioArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioArticlePage({ params }: PortfolioArticlePageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const profileHash = cookieStore.get('__profile')?.value;

  const [article, profile] = await Promise.all([
    PortfolioService.getPublicPortfolioItem(id),
    ProfileService.getResolvedProfile(profileHash),
  ]);

  if (!article) {
    notFound();
  }

  const author = {
    name: (profile?.basics?.name as string) || profile?.profile?.name || 'Yonatan Elias',
    headline: (profile?.basics?.headline as string) || (profile?.basics?.label as string) || 'Software Engineer',
    avatarUrl: (profile?.picture?.url as string) || (profile?.basics?.picture as string) || null,
  };

  const themeConfig = profile?.theme || null;

  return (
    <ThemeProvider themeConfig={themeConfig}>
      <div className={styles.portfolioPage}>
        <ArticleReader
          article={{
            ...article,
            markdownBody: article.markdownBody || '',
            links: article.links as ExternalLinkItem[] | null,
          }}
          author={author}
          hash={profileHash}
        />
      </div>
    </ThemeProvider>
  );
}
