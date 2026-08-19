import React from 'react';

interface PersonJsonLdProps {
  name: string;
  headline?: string;
  email?: string;
  telephone?: string;
  address?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  skills?: string[];
  alumniOf?: string[];
}

export const PersonJsonLd: React.FC<PersonJsonLdProps> = ({
  name,
  headline,
  email,
  telephone,
  address,
  url,
  image,
  sameAs = [],
  skills = [],
  alumniOf = [],
}) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle: headline || 'Computational Data Scientist & Full-Stack Developer',
    description: 'Specializing in deep learning neural architectures, geospatial data engineering, and high-performance systems.',
    url: url || siteUrl,
    image: image || undefined,
    email: email ? `mailto:${email}` : undefined,
    telephone: telephone || undefined,
    address: address
      ? {
          '@type': 'PostalAddress',
          addressLocality: address,
        }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
    knowsAbout: skills.length > 0 ? skills : undefined,
    alumniOf:
      alumniOf.length > 0
        ? alumniOf.map((org) => ({
            '@type': 'EducationalOrganization',
            name: org,
          }))
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
};

interface ArticleJsonLdProps {
  title: string;
  description?: string | null;
  url: string;
  datePublished?: string | Date | null;
  dateModified?: string | Date | null;
  authorName: string;
  authorUrl?: string;
  imageUrl?: string | null;
  tags?: string[];
}

export const ArticleJsonLd: React.FC<ArticleJsonLdProps> = ({
  title,
  description,
  url,
  datePublished,
  dateModified,
  authorName,
  authorUrl,
  imageUrl,
  tags = [],
}) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yonatanelias.dpdns.org';

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description: description || title,
    url,
    image: imageUrl || undefined,
    datePublished: datePublished ? new Date(datePublished).toISOString() : undefined,
    dateModified: dateModified ? new Date(dateModified).toISOString() : undefined,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl || siteUrl,
    },
    publisher: {
      '@type': 'Person',
      name: authorName,
      url: siteUrl,
    },
    keywords: tags.length > 0 ? tags.join(', ') : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
};
