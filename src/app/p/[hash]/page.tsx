import { notFound } from 'next/navigation';
import { ProfileService } from '@/lib/services/profile.service';
import { PortfolioService } from '@/lib/services/portfolio.service';
import { ProfileRenderer } from '@/components/client/ProfileRenderer';

export const revalidate = 0;

interface StealthProfilePageProps {
  params: Promise<{ hash: string }>;
}

export default async function StealthProfilePage({ params }: StealthProfilePageProps) {
  const { hash } = await params;

  const profile = await ProfileService.getResolvedProfile(hash);
  if (!profile) {
    notFound();
  }

  const portfolioArticles = await PortfolioService.getPublicPortfolioItems({ limit: 50 });

  return (
    <ProfileRenderer
      profile={profile}
      portfolioArticles={portfolioArticles}
      hash={hash}
    />
  );
}
