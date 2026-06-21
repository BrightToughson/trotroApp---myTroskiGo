import "@/lib/utils/polyfills";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { Stack, usePathname } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, View, UIManager, Text, TextInput, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme, LightColors } from "@/context/ThemeContext";
import { tokenCache } from "@/lib/auth/auth";
import { NotificationsWrapper as Notifications } from "@/lib/notifications/NotificationsWrapper";
import "@/lib/i18n/i18n";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { registerServiceWorker } from "@/lib/serviceWorker/serviceWorkerRegistration";
import { webPerformance } from "@/lib/web/WebPerformance";
import { 
  PlusJakartaSans_400Regular, 
  PlusJakartaSans_500Medium, 
  PlusJakartaSans_600SemiBold, 
  PlusJakartaSans_700Bold, 
  PlusJakartaSans_800ExtraBold 
} from "@expo-google-fonts/plus-jakarta-sans";
import { WebIcon } from "@/components/WebIcon";
import { CustomButton } from "@/components/customButton";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { FareService } from "@/lib/fares/FareService";
import { NotificationService } from "@/lib/notifications/NotificationService";
import { RouteCacheService } from "@/lib/location/RouteCacheService";
import { NotificationBanner } from "@/components/NotificationBanner";
import { NetworkErrorBoundary } from "@/components/ErrorBoundary/NetworkErrorBoundary";

import { ms } from "@/lib/utils/metrics";

LogBox.ignoreLogs([
  'Script error.',
  'failed_to_load_clerk_js',
  'Failed to load Clerk JS'
]);


let globalFatalErrorCallback: ((msg: string) => void) | null = null;

// Ensure OAuth popups close correctly on the web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Suppress generic cross-origin "Script error." from showing the red screen
  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.' || (event.message && event.message.includes('Script error.'))) {
      console.warn('Ignored cross-origin script error.');
      event.preventDefault(); // Prevents the default error overlay
      event.stopImmediatePropagation();
      if (globalFatalErrorCallback) globalFatalErrorCallback("A network script failed to load.");
    }
  }, true); // Use capture phase to intercept before Metro runtime

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (typeof msg === 'string' && (msg.includes('Script error.') || msg.includes('failed_to_load_clerk_js') || msg.includes('Failed to load Clerk JS'))) {
      console.warn('Ignored unhandled promise rejection script error for Clerk/Cross-origin.');
      event.preventDefault(); // Prevents the default error overlay
      event.stopImmediatePropagation();
      if (globalFatalErrorCallback) globalFatalErrorCallback("Connection to authentication server failed.");
    }
  }, true);
}



if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

if (Platform.OS !== "web") {
  // Properly extend React Native default props with custom styles
  const TextAny = Text as any;
  if (TextAny.defaultProps == null) TextAny.defaultProps = {};
  TextAny.defaultProps.style = { fontFamily: 'PlusJakartaSans-Regular' };
  TextAny.defaultProps.allowFontScaling = false;
  
  const TextInputAny = TextInput as any;
  if (TextInputAny.defaultProps == null) TextInputAny.defaultProps = {};
  TextInputAny.defaultProps.style = { fontFamily: 'PlusJakartaSans-Regular' };
  TextInputAny.defaultProps.allowFontScaling = false;
}

/* Prevent splash screen from hiding until app is ready */
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function RootStack() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(root)" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}

function DesktopWrapper({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {children}
      </View>
    );
  }

  const isFullWidth = false;
  
  // Detect standalone PWA (iOS & Android) to provide fallback padding
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone
  );
  
  // Apply a 44px top padding if running as PWA and no safe area insets are automatically applied.
  const webPaddingTop = isStandalone && insets.top === 0 ? 44 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', width: '100%', overflow: 'hidden' }}>
      <View style={{ 
        flex: 1, 
        width: '100%', 
        maxWidth: isFullWidth ? '100%' : 480, 
        overflow: 'hidden', 
        backgroundColor: colors.background,
        borderLeftWidth: isFullWidth ? 0 : 1,
        borderRightWidth: isFullWidth ? 0 : 1,
        borderColor: colors.border,
        paddingTop: webPaddingTop
      }}>
        {children}
      </View>
    </View>
  );
}

import { setClerkTokenGetter } from "@/lib/auth/supabase";
import { useTranslation } from "react-i18next";

// Clerk Error Fallback - ensures app continues to work even if Clerk fails
function ClerkErrorFallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoaded) {
      console.warn('[ClerkErrorFallback] Clerk not loaded - app running in limited mode');
    }
  }, [isLoaded]);

  // If Clerk is loaded successfully, render nothing
  if (isLoaded) {
    return null;
  }

  // If Clerk fails to load, show a subtle indicator but let app continue
  return (
    <>
      {Platform.OS === 'web' && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          color: colors.text,
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          Authentication limited
        </div>
      )}
    </>
  );
}

function SupabaseTokenSync() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    setClerkTokenGetter(() => getToken({ template: 'supabase' }));
  }, [getToken]);

  return null;
}

export default function RootLayout() {
  const { t } = useTranslation();
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    globalFatalErrorCallback = (msg) => {
      setFatalError(msg);
    };
    return () => {
      globalFatalErrorCallback = null;
    };
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      SplashScreen.preventAutoHideAsync();
    }
    RouteCacheService.clearAll();
    FareService.init();
    NotificationService.registerForPushNotificationsAsync();
    const unsubscribeChannel = NotificationService.initRealtime();

    // Register service worker for PWA support
    if (Platform.OS === 'web') {
      registerServiceWorker();

      // Initialize web performance monitoring
      webPerformance.setupLazyLoading();

      // Track performance metrics periodically
      const performanceInterval = setInterval(() => {
        webPerformance.trackMemoryUsage();
      }, 30000); // Every 30 seconds

      // Clean up performance monitoring on unmount
      return () => {
        if (unsubscribeChannel) unsubscribeChannel();
        clearInterval(performanceInterval);
        webPerformance.cleanup();
      };
    }

    return () => {
      if (unsubscribeChannel) unsubscribeChannel();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (Platform.OS !== "web") {
        SplashScreen.hideAsync();
      } else {
        const splash = typeof document !== 'undefined' ? document.getElementById('web-splash') : null;
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => {
            splash.style.display = 'none';
          }, 500);
        }
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (fatalError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' }}>
        <WebIcon name="apps-outline" size={80} color="#0286FF" />
        <Text style={{ fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', marginTop: 24, textAlign: 'center', color: '#000' }}>
          Almost Ready!
        </Text>
        <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans-Regular', color: '#666', marginTop: 12, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
          myTroski Go is optimizing for your home screen. Please tap the button below to finish setup and launch the app.
        </Text>
        <CustomButton
          title="Refresh"
          onPress={() => typeof window !== 'undefined' && window.location.reload()}
        />
      </View>
    );
  }

  if (!publishableKey || publishableKey === 'dummy_clerk_key') {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "white" }}>
        <Text style={{ color: "red", fontSize: 20, fontWeight: "bold" }}>{t('error_clerk_key', 'Clerk Key Missing in Vercel Environment Variables')}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
      <ThemeProvider>
        <SafeAreaProvider style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          <NetworkErrorBoundary>
            <ClerkProvider
              publishableKey={publishableKey}
              tokenCache={Platform.OS !== "web" ? tokenCache : undefined}
            >
              <SupabaseTokenSync />
                {Platform.OS === 'web' && (
                  <Head>
                    <title>myTroski Go - Smart City Commuting in Ghana</title>
                    <meta name="description" content="Navigate your city with ease. Real-time trotro routing, community updates, and smart commuting solutions for Accra and beyond." />
                    <meta name="keywords" content="trotro, Ghana, Accra, public transport, commuting, bus routes, navigation, smart city" />

                    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
                    <meta name="theme-color" content="#0286FF" />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                    <meta name="apple-mobile-web-app-title" content="myTroski Go" />

                    <meta name="application-name" content="myTroski Go" />
                    <meta name="mobile-web-app-capable" content="yes" />

                    <link rel="manifest" href="/manifest.json" />
                    <link rel="icon" type="image/png" sizes="192x192" href="/assets/logo/mytroskigo_apk.png" />
                    <link rel="apple-touch-icon" sizes="192x192" href="/assets/logo/mytroskigo_apk.png" />
                    <link rel="icon" type="image/png" sizes="512x512" href="/assets/logo/mytroskigo_favicon.png" />

                    <meta name="robots" content="index, follow" />
                    <meta name="googlebot" content="index, follow" />
                    <meta name="author" content="myTroski Go Team" />
                    <meta name="copyright" content="© 2026 myTroski Go" />

                    <meta property="og:title" content="myTroski Go - Smart City Commuting" />
                    <meta property="og:description" content="Navigate your city with ease. Real-time trotro routing, community updates, and smart commuting solutions for Ghana." />
                    <meta property="og:type" content="website" />
                    <meta property="og:url" content="https://mytroski.com" />
                    <meta property="og:image" content="/assets/logo/mytroskigo_display.png" />
                    <meta property="og:locale" content="en_US" />
                    <meta property="og:site_name" content="myTroski Go" />

                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="myTroski Go - Smart City Commuting" />
                    <meta name="twitter:description" content="Navigate your city with ease. Real-time trotro routing, community updates, and smart commuting solutions for Ghana." />
                    <meta name="twitter:image" content="/assets/logo/mytroskigo_display.png" />
                    <meta name="twitter:site" content="@mytroskigo" />

                    <meta name="msapplication-TileColor" content="#0286FF" />
                    <meta name="msapplication-TileImage" content="/assets/logo/mytroskigo_apk.png" />

                    <meta name="format-detection" content="telephone=no" />
                    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
                  </Head>
                )}
                  <DesktopWrapper>
                    <RootStack />
                    <NotificationBanner />
                  </DesktopWrapper>
            </ClerkProvider>
          </NetworkErrorBoundary>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fullFlex: {
    flex: 1,
  },
  webWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

import { ErrorBoundaryProps } from "expo-router";

// This is specifically for expo-router errors
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const isClerkError = error?.message?.includes('failed_to_load_clerk_js') || error?.message?.includes('Clerk JS');
  const isRouteError = error?.message?.includes('route') || error?.message?.includes('navigation');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#ffffff' }}>
      <Ionicons name={isClerkError ? "cloud-offline-outline" : isRouteError ? "navigate-outline" : "alert-circle-outline"} size={64} color="#FF3B30" />
      <Text style={{ fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', marginTop: 20, textAlign: 'center', color: '#000' }}>
        {isClerkError ? "Connection Issue" : isRouteError ? "Navigation Error" : "Something went wrong"}
      </Text>
      <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans-Regular', color: '#666', marginTop: 10, textAlign: 'center', marginBottom: 30 }}>
        {isClerkError
          ? "We couldn't connect to the authentication server. Please check your internet connection. If you are using an ad blocker, it might be blocking the login service."
          : isRouteError
          ? "There was an error navigating to this page. Please try again."
          : error?.message || "An unexpected error occurred."}
      </Text>
      <CustomButton
        title="Try Again"
        onPress={retry}
      />
    </View>
  );
}
