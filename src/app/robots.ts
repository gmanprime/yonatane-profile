import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/portfolio', '/portfolio/*', '/p/*'],
        disallow: ['/admin', '/admin/*', '/api/*', '/_next/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
