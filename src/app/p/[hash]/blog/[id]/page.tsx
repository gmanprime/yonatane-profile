import { notFound } from 'next/navigation';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileService } from '@/lib/services/profile.service';
import { ThemeProvider } from '@/components/client/ThemeProvider';
import { ArticleReader } from '@/components/client/portfolio/ArticleReader';
import { type ExternalLinkItem } from '@/components/admin/portfolio/ExternalLinksManager';
import styles from '@/components/client/portfolio/portfolio.module.css';

export const revalidate = 0;

interface StealthArticlePageProps {
  params: Promise<{ hash: string; id: string }>;
}

export default async function StealthArticlePage({ params }: StealthArticlePageProps) {
  const { hash, id } = await params;

  const [article, profile] = await Promise.all([
    PortfolioService.getPublicPortfolioItem(id),
    ProfileService.getResolvedProfile(hash),
  ]);

  if (!article || !profile) {
    notFound();
  }

  const author = {
    name: (profile.basics.name as string) || profile.profile.name || 'Yonatan Elias',
    headline: (profile.basics.headline as string) || (profile.basics.label as string) || 'Software Engineer',
    avatarUrl: (profile.picture.url as string) || (profile.basics.picture as string) || null,
  };

  return (
    <ThemeProvider themeConfig={profile.theme}>
      <div className={styles.portfolioPage}>
        <ArticleReader
          article={{
            ...article,
            markdownBody: article.markdownBody || '',
            links: article.links as ExternalLinkItem[] | null,
          }}
          author={author}
          hash={hash}
        />
      </div>
    </ThemeProvider>
  );
}
