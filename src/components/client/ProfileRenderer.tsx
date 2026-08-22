'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { type ResolvedProfile, type ResolvedProfileSection } from '@/lib/types/profile.types';
import { ThemeProvider } from './ThemeProvider';
import { ProfileHeader } from './ProfileHeader';
import { SectionNav, type NavSection } from './SectionNav';
import { MobileNavDock } from './MobileNavDock';
import { QRShareModal } from './QRShareModal';
import { ExperienceSection } from './sections/ExperienceSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { ProjectsSection, type LinkedPortfolioArticle } from './sections/ProjectsSection';
import { ProfilesSection } from './sections/ProfilesSection';
import { CertificationsSection } from './sections/CertificationsSection';
import { AwardsSection } from './sections/AwardsSection';
import { LanguagesSection } from './sections/LanguagesSection';
import { PublicationsSection } from './sections/PublicationsSection';
import { VolunteerSection } from './sections/VolunteerSection';
import { CustomSection } from './sections/CustomSection';
import { AboutSection } from './sections/AboutSection';
import { ClientTelemetry } from './ClientTelemetry';
import styles from './client.module.css';

interface ProfileRendererProps {
  profile: ResolvedProfile;
  portfolioArticles?: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    coverImageUrl: string | null;
    projectItemId: string | null;
  }>;
  hash?: string;
}

export const ProfileRenderer: React.FC<ProfileRendererProps> = ({
  profile,
  portfolioArticles = [],
  hash,
}) => {
  // Map project item IDs to corresponding published portfolio articles
  const portfolioArticleMap = useMemo(() => {
    const map: Record<string, LinkedPortfolioArticle> = {};
    for (const art of portfolioArticles) {
      if (art.projectItemId) {
        map[art.projectItemId] = {
          id: art.id,
          title: art.title,
          subtitle: art.subtitle,
          coverImageUrl: art.coverImageUrl,
        };
      }
    }
    return map;
  }, [portfolioArticles]);

  // Extract profileItems (social links/networks) for integration into About section
  const profileItems = useMemo(() => {
    return profile.sections.find(
      (sec) => sec.type.toLowerCase() === 'profiles' || sec.type.toLowerCase() === 'social'
    )?.items || [];
  }, [profile.sections]);

  // Filter sections excluding profiles (which are embedded inside About)
  const visibleSections = useMemo(() => {
    return profile.sections.filter((sec) => {
      const isProfileType = sec.type.toLowerCase() === 'profiles' || sec.type.toLowerCase() === 'social';
      return !isProfileType && sec.items && sec.items.length > 0;
    });
  }, [profile.sections]);

  // Extract navigation sections with About as primary splash entry
  const navSections: NavSection[] = useMemo(() => {
    const sections: NavSection[] = [
      { id: 'about', title: 'About', type: 'about' },
      ...visibleSections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        type: sec.type,
      })),
    ];
    return sections;
  }, [visibleSections]);

  const [showQRModal, setShowQRModal] = React.useState(false);
  const [selectedTabId, setSelectedTabId] = React.useState<string>('about');

  const candidateName = (profile.basics.name as string) || profile.profile.name || 'Yonatan Elias';
  const hasPortfolio = portfolioArticles.length > 0;
  const currentYear = new Date().getFullYear();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://yonatanelias.dpdns.org';

  const handleOpenQR = () => setShowQRModal(true);
  const handleCloseQR = () => setShowQRModal(false);

  return (
    <ThemeProvider themeConfig={profile.theme}>
      <div className={styles.profileContainer}>
        {/* Telemetry Logger */}
        <ClientTelemetry profileId={profile.profile.id} />

        {/* Ambient Atmospheric Glow Mesh */}
        <div className={styles.backgroundGlow} />
        <div className={styles.backgroundGlowSecondary} />
        <div className={styles.backgroundGlowTertiary} />

        <div className={styles.desktopLayoutContainer}>
          {/* Left Sticky Sidebar (Desktop) / Centered Hero Column (Mobile) */}
          <aside className={styles.desktopAside}>
            {/* Desktop-Only Compact Sidebar Header */}
            <div className={styles.desktopAsideHeader}>
              <ProfileHeader
                basics={profile.basics}
                summary={profile.summary}
                picture={profile.picture}
                profileName={profile.profile.name}
                hash={hash}
                hasPortfolio={hasPortfolio}
                onOpenQR={handleOpenQR}
                compact={true}
                onSelectAbout={() => setSelectedTabId('about')}
              />
            </div>

            {/* Mobile-Only Full Hero Header */}
            <div className={styles.mobileHeroHeader}>
              <ProfileHeader
                basics={profile.basics}
                summary={profile.summary}
                picture={profile.picture}
                profileName={profile.profile.name}
                hash={hash}
                hasPortfolio={hasPortfolio}
                onOpenQR={handleOpenQR}
                compact={false}
              />
            </div>

            {/* Desktop Vertical Section Navigation */}
            <div className={styles.desktopNavWrapper}>
              <SectionNav
                sections={navSections}
                vertical
                selectedTabId={selectedTabId}
                onSelectTab={setSelectedTabId}
              />
            </div>
          </aside>

          {/* Right Modular Content Pane */}
          <main className={styles.desktopMainContent}>
            {/* Dedicated Desktop About & Executive Overview Splash Section */}
            <section
              id="about"
              className={`${styles.sectionBlock} ${styles.aboutSectionBlock} ${selectedTabId === 'about' ? styles.sectionActiveTab : styles.sectionInactiveTab}`}
              aria-labelledby="section-heading-about"
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleGroup}>
                  <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <h2 id="section-heading-about" className={styles.sectionTitle}>
                    About & Executive Overview
                  </h2>
                </div>
              </div>

              <AboutSection
                basics={profile.basics}
                summary={profile.summary}
                profileName={profile.profile.name}
                hash={hash}
                hasPortfolio={hasPortfolio}
                onOpenQR={handleOpenQR}
                profileItems={profileItems}
              />
            </section>

            {visibleSections.map((section) => (
              <RenderSection
                key={section.id}
                section={section}
                portfolioArticleMap={portfolioArticleMap}
                hash={hash}
                isActiveTab={section.id === selectedTabId}
              />
            ))}

            {/* Client Footer */}
            <footer className={styles.clientFooter}>
              <div className={styles.footerLinks}>
                <Link href="/" className={styles.footerLink}>
                  Home Profile
                </Link>
                {hasPortfolio && (
                  <Link
                    href={hash && hash !== 'default' ? `/p/${hash}/blog` : '/portfolio'}
                    className={styles.footerLink}
                  >
                    Portfolio & Articles
                  </Link>
                )}
              </div>
              <p style={{ margin: 0 }}>
                &copy; {currentYear}{' '}
                <Link
                  href="/admin/login"
                  className={styles.footerAdminLink}
                  title="Admin Portal"
                >
                  {candidateName}
                </Link>
                . All rights reserved.
              </p>
            </footer>
          </main>
        </div>

        {/* Floating Mobile Quick-Jump Navigation Dock */}
        <MobileNavDock
          sections={navSections}
          onOpenQR={handleOpenQR}
          onDownloadResume={() => {
            window.location.href = `/api/v1/public/profile/${hash && hash !== 'default' ? hash : 'default'}/pdf`;
          }}
        />

        {/* Share / QR Modal */}
        <QRShareModal
          url={currentUrl}
          name={candidateName}
          isOpen={showQRModal}
          onClose={handleCloseQR}
        />
      </div>
    </ThemeProvider>
  );
};

// Section Icon Generator
function getSectionIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'experience':
    case 'work':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );
    case 'education':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      );
    case 'skills':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case 'projects':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'profiles':
    case 'social':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case 'certifications':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'awards':
    case 'honors':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    case 'languages':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'publications':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case 'volunteer':
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    default:
      return (
        <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

// Polymorphic Section Dispatcher
function RenderSection({
  section,
  portfolioArticleMap,
  hash,
  isActiveTab,
}: {
  section: ResolvedProfileSection;
  portfolioArticleMap: Record<string, LinkedPortfolioArticle>;
  hash?: string;
  isActiveTab?: boolean;
}) {
  if (!section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section
      id={section.id}
      className={`${styles.sectionBlock} ${isActiveTab ? styles.sectionActiveTab : styles.sectionInactiveTab}`}
      aria-labelledby={`section-heading-${section.id}`}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          {getSectionIcon(section.type)}
          <h2 id={`section-heading-${section.id}`} className={styles.sectionTitle}>
            {section.title}
          </h2>
        </div>
        <span className={styles.sectionCountBadge} aria-label={`${section.items.length} items`}>
          {section.items.length}
        </span>
      </div>

      {(() => {
        switch (section.type.toLowerCase()) {
          case 'experience':
          case 'work':
            return <ExperienceSection items={section.items} />;
          case 'education':
            return <EducationSection items={section.items} columns={section.columns} />;
          case 'skills':
            return <SkillsSection items={section.items} columns={section.columns} />;
          case 'projects':
            return (
              <ProjectsSection
                items={section.items}
                columns={section.columns}
                portfolioArticleMap={portfolioArticleMap}
                hash={hash}
              />
            );
          case 'profiles':
          case 'social':
            return <ProfilesSection items={section.items} />;
          case 'certifications':
            return <CertificationsSection items={section.items} columns={section.columns} />;
          case 'awards':
          case 'honors':
            return <AwardsSection items={section.items} columns={section.columns} />;
          case 'languages':
            return <LanguagesSection items={section.items} columns={section.columns} />;
          case 'publications':
            return <PublicationsSection items={section.items} columns={section.columns} />;
          case 'volunteer':
            return <VolunteerSection items={section.items} columns={section.columns} />;
          default:
            return <CustomSection items={section.items} columns={section.columns} />;
        }
      })()}
    </section>
  );
}
