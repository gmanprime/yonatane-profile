'use client';

import React, { useEffect, useRef } from 'react';

interface ClientTelemetryProps {
  profileId: string;
}

export const ClientTelemetry: React.FC<ClientTelemetryProps> = ({ profileId }) => {
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (!profileId || hasLoggedRef.current) return;

    // Check sessionStorage so we don't log duplicate visits on quick re-renders
    const storageKey = `logged_visit_${profileId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey)) {
      return;
    }

    hasLoggedRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, 'true');
      }

      fetch('/api/v1/public/analytics/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          screenWidth: typeof window !== 'undefined' ? window.screen.width : undefined,
          screenHeight: typeof window !== 'undefined' ? window.screen.height : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        }),
      }).catch(() => {
        // Silently ignore telemetry logging errors
      });
    } catch {
      // Ignore
    }
  }, [profileId]);

  return null;
};
