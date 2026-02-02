'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const MEMBERSTACK_APP_ID = process.env.NEXT_PUBLIC_MEMBERSTACK_APP_ID || 'app_clpt8hly400dh0tsp9pceci13';
const MEMBERSTACK_ENV = process.env.NEXT_PUBLIC_MEMBERSTACK_ENV || 'staging';

export default function MemberstackScript() {
  // Log SDK status after component mounts
  useEffect(() => {
    const checkSdk = () => {
      if (window.$memberstackDom) {
        console.log('[Memberstack] SDK is available:', {
          appId: MEMBERSTACK_APP_ID,
          env: MEMBERSTACK_ENV,
        });
      }
    };

    // Check after a short delay to allow SDK to initialize
    const timer = setTimeout(checkSdk, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Set environment variable for Memberstack */}
      <Script id="memberstack-env" strategy="beforeInteractive">
        {`window.MEMBERSTACK_ENV = '${MEMBERSTACK_ENV}';`}
      </Script>

      {/* Memberstack 2.0 SDK */}
      <Script
        src="https://static.memberstack.com/scripts/v2/memberstack.js"
        data-memberstack-app={MEMBERSTACK_APP_ID}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[Memberstack] SDK script loaded, waiting for initialization...');
        }}
        onError={() => {
          console.error('[Memberstack] Failed to load SDK script');
        }}
      />
    </>
  );
}
