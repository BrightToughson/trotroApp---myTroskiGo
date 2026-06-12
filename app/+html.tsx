import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover" />

        {/* Preconnect to Mapbox CDN to load map tiles up to 400ms faster! */}
        <link rel="preconnect" href="https://api.mapbox.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://events.mapbox.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://events.mapbox.com" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
        */}
        <ScrollViewStyleReset />

        {/* Global CSS for full edge-to-edge web experience */}
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --sat: env(safe-area-inset-top);
            --sar: env(safe-area-inset-right);
            --sab: env(safe-area-inset-bottom);
            --sal: env(safe-area-inset-left);
          }
          html {
            height: 100%;
            width: 100%;
            overflow: hidden;
            overscroll-behavior: none;
          }
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: #E6F4FE;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
            touch-action: pan-x pan-y;
            overscroll-behavior: none;
            height: 100dvh;
            width: 100%;
            position: fixed; /* Prevents bounce scrolling on iOS */
          }
          #root {
            flex: 1;
            display: flex;
            height: 100%;
            width: 100%;
            overflow: hidden;
          }
          /* Custom Scrollbar for a cleaner look */
          ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
          }
        `}} />

        {/* PWA Android / General */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#EAB308" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />

        {/* SEO & Open Graph */}
        <meta name="description" content="Your ultimate transit companion for Trotro travel in Ghana." />
        <meta property="og:title" content="myTroski Go" />
        <meta property="og:description" content="Your ultimate transit companion for Trotro travel in Ghana." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo/mytroskigo.png" />
        <meta name="twitter:card" content="summary" />

        {/* PWA iOS specific tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="myTroski Go" />
        <link rel="apple-touch-icon" href="/logo/mytroskigo.png" />
        
        {/* Splash screen image for iOS (optional but recommended for a native feel) */}
        <link rel="apple-touch-startup-image" href="/logo/mytroskigo.png" />

        {/* Prevent iOS Safari from zooming (pinch and double-tap) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent pinch to zoom
              document.addEventListener('gesturestart', function (e) {
                e.preventDefault();
              });
              
              // Prevent double tap to zoom
              let lastTouchEnd = 0;
              document.addEventListener('touchend', function (event) {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                  event.preventDefault();
                }
                lastTouchEnd = now;
              }, false);
            `,
          }}
        />

        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>
        {children}
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
