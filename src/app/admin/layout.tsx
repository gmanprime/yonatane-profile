'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './admin.module.css';

interface NavItem {
  name: string;
  href: string;
  badge?: string;
  icon: React.ReactNode;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [user, setUser] = useState<{ displayName: string; email: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close mobile drawer on route changes during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  // Fetch current authenticated user info
  useEffect(() => {
    if (pathname === '/admin/login') return;

    let isMounted = true;
    async function fetchUser() {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser({
              displayName: data.user.displayName || 'Admin',
              email: data.user.email || 'admin@yonatanelias.dpdns.org',
            });
          }
        }
      } catch {
        // Fallback default admin user display
        if (isMounted) {
          setUser({
            displayName: 'Yonatan Elias',
            email: 'yonatan@yonatanelias.dpdns.org',
          });
        }
      }
    }

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/v1/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // If visiting login screen, render without the admin navigation shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      name: 'Content Datasets',
      href: '/admin/content',
      badge: 'Resume',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      name: 'Profiles & Stealth Links',
      href: '/admin/profiles',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      name: 'Themes',
      href: '/admin/themes',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      name: 'Portfolio Articles',
      href: '/admin/portfolio',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      badge: 'Live',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      name: 'Settings & Keystore',
      href: '/admin/settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  const getPageHeading = () => {
    if (pathname === '/admin') return 'Admin Overview';
    if (pathname.startsWith('/admin/content')) return 'Content Datasets';
    if (pathname.startsWith('/admin/profiles')) return 'Profiles & Stealth Links';
    if (pathname.startsWith('/admin/themes')) return 'Theme Customizer';
    if (pathname.startsWith('/admin/portfolio')) return 'Portfolio CMS';
    if (pathname.startsWith('/admin/analytics')) return 'Visitor Telemetry';
    if (pathname.startsWith('/admin/settings')) return 'Settings & Keystore';
    return 'Admin Portal';
  };

  const navContent = (
    <>
      <div className={styles.sidebarHeader}>
        <Link href="/admin" className={styles.brandLogo}>
          <div className={styles.logoIcon}>YE</div>
          {!isCollapsed && (
            <div className={styles.brandText}>
              <span className={styles.brandName}>Yonatan Elias</span>
              <span className={styles.brandTag}>Profile Admin</span>
            </div>
          )}
        </Link>
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      <nav className={styles.navSection}>
        {!isCollapsed && <span className={styles.navSectionLabel}>Platform Navigation</span>}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <div className={styles.navIcon}>{item.icon}</div>
              {!isCollapsed && (
                <>
                  <span>{item.name}</span>
                  {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>
            {(user?.displayName?.[0] || 'Y').toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user?.displayName || 'Yonatan Elias'}</div>
              <div className={styles.userEmail}>{user?.email || 'admin@profile.dev'}</div>
            </div>
          )}
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  const isPortfolioEditor = pathname.startsWith('/admin/portfolio/') && pathname !== '/admin/portfolio';

  return (
    <div className={`${styles.adminRoot} ${isMobileOpen ? styles.drawerOpen : ''}`}>
      {/* Desktop Sidebar */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        {navContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      <div
        className={styles.drawerBackdrop}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />
      <div className={styles.mobileDrawer}>
        {navContent}
      </div>

      {/* Main Administrative Container */}
      <div className={styles.mainContainer}>
        {/* Mobile Top Bar */}
        <header className={styles.mobileTopBar}>
          <button
            type="button"
            className={styles.mobileMenuToggle}
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open Navigation Drawer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/admin" className={styles.brandLogo}>
            <div className={styles.logoIcon}>YE</div>
            <span className={styles.brandName}>Yonatan Elias</span>
          </Link>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </header>

        {/* Desktop Sticky Header */}
        {!isPortfolioEditor && (
          <header className={styles.topHeader}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.pageTitle}>{getPageHeading()}</h1>
              <span className={styles.statusIndicator}>
                <span className={styles.statusDot} />
                Stealth Engine Active
              </span>
            </div>

            <div className={styles.headerActions}>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.publicViewButton}
              >
                <span>View Public Profile</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </Link>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className={`${styles.contentWrapper} ${isPortfolioEditor ? styles.fullWidthPage : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
