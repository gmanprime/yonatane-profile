import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileService } from '@/lib/services/profile.service';
import { ThemeProvider } from '@/components/client/ThemeProvider';
import { ArticleReader } from '@/components/client/portfolio/ArticleReader';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import { type ExternalLinkItem } from '@/components/admin/portfolio/ExternalLinksManager';
import styles from '@/components/client/portfolio/portfolio.module.css';

export const revalidate = 0;

interface PortfolioArticlePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PortfolioArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await PortfolioService.getPublicPortfolioItem(id);

  if (!article) {
    return { title: 'Article Not Found' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';
  const ogImage =
    article.coverImageUrl ||
    'https://rxresu.me/api/uploads/01a009e3-30f9-70ab-aa6e-80d9a91ef075/pictures/1786885952177.jpeg';

  return {
    title: article.title,
    description: article.subtitle || article.title,
    keywords: (article.tags as string[]) || [],
    openGraph: {
      title: article.title,
      description: article.subtitle || article.title,
      url: `${siteUrl}/portfolio/${id}`,
      type: 'article',
      publishedTime: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.subtitle || article.title,
      images: [ogImage],
    },
  };
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
    headline: (profile?.basics?.headline as string) || (profile?.basics?.label as string) || 'Computational Data Scientist & Full-Stack Developer',
    avatarUrl: (profile?.picture?.url as string) || (profile?.basics?.picture as string) || null,
  };

  const themeConfig = profile?.theme || null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

  return (
    <ThemeProvider themeConfig={themeConfig}>
      <ArticleJsonLd
        title={article.title}
        description={article.subtitle}
        url={`${siteUrl}/portfolio/${article.id}`}
        datePublished={article.publishedAt}
        dateModified={article.updatedAt}
        authorName={author.name}
        imageUrl={article.coverImageUrl}
        tags={(article.tags as string[]) || []}
      />
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
