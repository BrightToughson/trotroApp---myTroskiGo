import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { Stack, usePathname } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Image, Platform, StyleSheet, View, UIManager, Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme, LightColors } from "@/context/ThemeContext";
import { tokenCache } from "@/lib/auth";
import { NotificationsWrapper as Notifications } from "@/lib/NotificationsWrapper";
import "@/lib/i18n";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
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
import { FareService } from "@/lib/FareService";
import { NotificationService } from "@/lib/NotificationService";
import { RouteCacheService } from "@/lib/RouteCacheService";
import { NotificationBanner } from "@/components/NotificationBanner";




/* Polyfill setImmediate for web compatibility (fixes react-native-swiper error) */
if (Platform.OS === "web") {
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).setImmediate === "undefined") {
    (globalThis as any).setImmediate = function (fn: any) {
      return setTimeout(fn, 0);
    };
  }
}

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

if (Platform.OS !== "web") {
  // @ts-ignore
  if (Text.defaultProps == null) Text.defaultProps = {};
  // @ts-ignore
  Text.defaultProps.style = { fontFamily: 'PlusJakartaSans-Regular' };
  // @ts-ignore
  Text.defaultProps.allowFontScaling = false;
  
  // @ts-ignore
  if (TextInput.defaultProps == null) TextInput.defaultProps = {};
  // @ts-ignore
  TextInput.defaultProps.style = { fontFamily: 'PlusJakartaSans-Regular' };
  // @ts-ignore
  TextInput.defaultProps.allowFontScaling = false;
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
  const webPaddingTop = isStandalone && insets.top= == 0 ? 44 : 0;

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

import { setClerkTokenGetter } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

function SupabaseTokenSync() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    setClerkTokenGetter(() => getToken({ template: 'supabase' }));
  }, [getToken]);

  return null;
}

export default function RootLayout() {
  const { t } = useTranslation();
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
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (Platform.OS !== "web") {
        SplashScreen.hideAsync();
      }
    }
  }, [fontsLoaded, fontError]);

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{t('error_clerk_key', 'Clerk Key Missing')}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
      <ThemeProvider>
        <SafeAreaProvider style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          <ClerkProvider
            publishableKey={publishableKey}
            tokenCache={Platform.OS !== "web" ? tokenCache : undefined}
          >
            <SupabaseTokenSync />
            <ClerkLoaded>
              {Platform.OS === 'web' && (
                <Head>
                  <title>myTroski Go</title>
                  <meta name="viewport" content="width= device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
                  <meta name="apple-mobile-web-app-capable" content="yes" />
                  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                </Head>
              )}
              <DesktopWrapper>
                <RootStack />
                <NotificationBanner />
              </DesktopWrapper>
            </ClerkLoaded>
          </ClerkProvider>
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
