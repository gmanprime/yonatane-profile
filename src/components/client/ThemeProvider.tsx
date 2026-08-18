'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { SYSTEM_DEFAULT_THEME_CONFIG } from '@/lib/services/theme.service';

interface ResolvedThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
    muted: string;
    border: string;
    [key: string]: string;
  };
  typography: {
    headingFont?: string;
    bodyFont?: string;
    monoFont?: string;
    baseFontSize?: string;
    scaleRatio?: number;
    [key: string]: unknown;
  };
  spacing: {
    sectionGap?: string;
    itemGap?: string;
    contentMaxWidth?: string;
    [key: string]: unknown;
  };
  layout: {
    headerAlign?: string;
    sectionTitleAlign?: string;
    cardBorderRadius?: string;
    elevation?: string;
    [key: string]: unknown;
  };
}

interface ThemeContextType {
  theme: ResolvedThemeConfig;
}

const defaultResolvedTheme: ResolvedThemeConfig = {
  colors: {
    primary: SYSTEM_DEFAULT_THEME_CONFIG.colors?.primary || '#6366f1',
    secondary: SYSTEM_DEFAULT_THEME_CONFIG.colors?.secondary || '#8b5cf6',
    background: SYSTEM_DEFAULT_THEME_CONFIG.colors?.background || '#090a0f',
    surface: SYSTEM_DEFAULT_THEME_CONFIG.colors?.surface || '#12141f',
    text: SYSTEM_DEFAULT_THEME_CONFIG.colors?.text || '#f8fafc',
    accent: SYSTEM_DEFAULT_THEME_CONFIG.colors?.accent || '#38bdf8',
    muted: SYSTEM_DEFAULT_THEME_CONFIG.colors?.muted || '#94a3b8',
    border: SYSTEM_DEFAULT_THEME_CONFIG.colors?.border || '#1e293b',
  },
  typography: {
    headingFont: SYSTEM_DEFAULT_THEME_CONFIG.typography?.headingFont || 'var(--font-geist-sans), system-ui, sans-serif',
    bodyFont: SYSTEM_DEFAULT_THEME_CONFIG.typography?.bodyFont || 'var(--font-geist-sans), system-ui, sans-serif',
    monoFont: SYSTEM_DEFAULT_THEME_CONFIG.typography?.monoFont || 'var(--font-geist-mono), monospace',
    baseFontSize: SYSTEM_DEFAULT_THEME_CONFIG.typography?.baseFontSize || '16px',
    scaleRatio: SYSTEM_DEFAULT_THEME_CONFIG.typography?.scaleRatio || 1.25,
  },
  spacing: {
    sectionGap: SYSTEM_DEFAULT_THEME_CONFIG.spacing?.sectionGap || '3.5rem',
    itemGap: SYSTEM_DEFAULT_THEME_CONFIG.spacing?.itemGap || '1.5rem',
    contentMaxWidth: SYSTEM_DEFAULT_THEME_CONFIG.spacing?.contentMaxWidth || '880px',
  },
  layout: {
    headerAlign: 'center',
    sectionTitleAlign: 'left',
    cardBorderRadius: '12px',
    elevation: 'subtle',
  },
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultResolvedTheme,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  themeConfig?: Record<string, unknown> | null;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  themeConfig,
  children,
}) => {
  const mergedTheme: ResolvedThemeConfig = useMemo(() => {
    if (!themeConfig) return defaultResolvedTheme;

    const rawColors = (themeConfig.colors as Record<string, string>) || {};
    const rawTypography = (themeConfig.typography as Record<string, unknown>) || {};
    const rawSpacing = (themeConfig.spacing as Record<string, string>) || {};
    const rawLayout = (themeConfig.layout as Record<string, unknown>) || {};

    return {
      colors: {
        ...defaultResolvedTheme.colors,
        ...rawColors,
      },
      typography: {
        ...defaultResolvedTheme.typography,
        ...rawTypography,
      },
      spacing: {
        ...defaultResolvedTheme.spacing,
        ...rawSpacing,
      },
      layout: {
        ...defaultResolvedTheme.layout,
        ...rawLayout,
      },
    };
  }, [themeConfig]);

  const cssVariables = useMemo(() => {
    return {
      '--theme-primary': mergedTheme.colors.primary,
      '--theme-secondary': mergedTheme.colors.secondary,
      '--theme-background': mergedTheme.colors.background,
      '--theme-surface': mergedTheme.colors.surface,
      '--theme-text': mergedTheme.colors.text,
      '--theme-accent': mergedTheme.colors.accent,
      '--theme-muted': mergedTheme.colors.muted,
      '--theme-border': mergedTheme.colors.border,

      '--theme-font-heading': (mergedTheme.typography.headingFont as string) || 'var(--font-geist-sans), system-ui, sans-serif',
      '--theme-font-body': (mergedTheme.typography.bodyFont as string) || 'var(--font-geist-sans), system-ui, sans-serif',
      '--theme-font-mono': (mergedTheme.typography.monoFont as string) || 'var(--font-geist-mono), monospace',
      '--theme-font-base-size': (mergedTheme.typography.baseFontSize as string) || '16px',
      '--theme-scale-ratio': mergedTheme.typography.scaleRatio?.toString() || '1.25',

      '--theme-section-gap': (mergedTheme.spacing.sectionGap as string) || '3.5rem',
      '--theme-item-gap': (mergedTheme.spacing.itemGap as string) || '1.5rem',
      '--theme-max-width': (mergedTheme.spacing.contentMaxWidth as string) || '880px',

      '--theme-header-align': (mergedTheme.layout.headerAlign as string) || 'center',
      '--theme-title-align': (mergedTheme.layout.sectionTitleAlign as string) || 'left',
      '--theme-border-radius': (mergedTheme.layout.cardBorderRadius as string) || '12px',
      '--theme-elevation': (mergedTheme.layout.elevation as string) || 'subtle',
    } as React.CSSProperties;
  }, [mergedTheme]);

  return (
    <ThemeContext.Provider value={{ theme: mergedTheme }}>
      <div className="theme-root" style={cssVariables}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
