import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { portfolioItems, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  try {
    const articles = await db
      .select({ id: portfolioItems.id, updatedAt: portfolioItems.updatedAt })
      .from(portfolioItems)
      .where(eq(portfolioItems.status, 'published'));

    for (const art of articles) {
      routes.push({
        url: `${baseUrl}/portfolio/${art.id}`,
        lastModified: art.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }

    const defaultProfiles = await db
      .select({ hash: profiles.hash, updatedAt: profiles.updatedAt })
      .from(profiles)
      .where(eq(profiles.isDefault, true));

    for (const p of defaultProfiles) {
      routes.push({
        url: `${baseUrl}/p/${p.hash}`,
        lastModified: p.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.9,
      });
    }
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
  }

  return routes;
}
